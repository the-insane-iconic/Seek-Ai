import React, { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  isActive: boolean;
  isPaused: boolean;
  frequencyData?: Uint8Array;
  level?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isActive,
  isPaused,
  frequencyData,
  level = 0
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 300;
    const height = canvas.clientHeight || 80;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const barCount = 36;
    const barWidth = 4;
    const spacing = (width - barCount * barWidth) / (barCount - 1);
    const centerY = height / 2;

    if (!isActive) {
      // Draw quiet baseline
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + spacing);
        ctx.fillRect(x, centerY - 2, barWidth, 4);
      }
      return;
    }

    if (isPaused) {
      // Paused pattern: calm muted gray bars
      ctx.fillStyle = '#52525b';
      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + spacing);
        const wave = Math.sin(i * 0.4) * 8 + 10;
        ctx.fillRect(x, centerY - wave / 2, barWidth, wave);
      }
      return;
    }

    // Active live audio bars: high contrast crisp white
    ctx.fillStyle = '#ffffff';

    for (let i = 0; i < barCount; i++) {
      let amp = 0.1;
      if (frequencyData && frequencyData.length > 0) {
        const dataIdx = Math.floor((i / barCount) * (frequencyData.length / 2));
        amp = frequencyData[dataIdx] / 255.0;
      } else {
        // Fallback simulation based on volume level
        amp = Math.max(0.1, level * (0.6 + Math.sin(Date.now() / 150 + i * 0.3) * 0.4));
      }

      // Smooth amplitude height
      const barHeight = Math.max(4, amp * (height - 16));
      const x = i * (barWidth + spacing);
      const y = centerY - barHeight / 2;

      // Rounded bars
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 3);
      ctx.fill();
    }
  }, [isActive, isPaused, frequencyData, level]);

  return (
    <div className="waveform-canvas-container">
      <canvas ref={canvasRef} className="waveform-canvas" />
    </div>
  );
};
