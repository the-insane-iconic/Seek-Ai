import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2 } from 'lucide-react';
import { formatDuration } from '../models/session';

interface AudioPlayerProps {
  src: string | null;
  totalDurationMs?: number;
  autoPlay?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  totalDurationMs = 0,
  autoPlay = false
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(totalDurationMs);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  useEffect(() => {
    if (totalDurationMs > 0) {
      setDurationMs(totalDurationMs);
    }
  }, [totalDurationMs]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTimeMs(audio.currentTime * 1000);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDurationMs(audio.duration * 1000);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTimeMs(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    if (autoPlay && src) {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src, autoPlay]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(err => {
        console.error('Audio play error:', err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetMs = Number(e.target.value);
    setCurrentTimeMs(targetMs);
    if (audioRef.current) {
      audioRef.current.currentTime = targetMs / 1000;
    }
  };

  const handleSkip = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, (durationMs || 1000) / 1000));
    audioRef.current.currentTime = newTime;
    setCurrentTimeMs(newTime * 1000);
  };

  const cyclePlaybackRate = () => {
    const rates = [1.0, 1.25, 1.5, 2.0];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  if (!src) {
    return (
      <div className="audio-player-wrapper" style={{ textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
        <span>Audio source unavailable</span>
      </div>
    );
  }

  const effectiveDuration = durationMs || totalDurationMs || 1000;

  return (
    <div className="audio-player-wrapper">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Scrubber and time labels */}
      <div className="player-scrubber-row">
        <input
          type="range"
          min="0"
          max={effectiveDuration}
          value={currentTimeMs}
          onChange={handleSeek}
          className="scrubber-slider"
          aria-label="Audio scrubber"
        />
        <div className="time-row">
          <span>{formatDuration(currentTimeMs)}</span>
          <span>{formatDuration(effectiveDuration)}</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="player-controls-row">
        {/* Playback speed toggle */}
        <button
          className="speed-toggle-btn"
          onClick={cyclePlaybackRate}
          title="Change playback speed"
        >
          {playbackRate}x
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Skip Back 5s */}
          <button 
            className="card-options-btn" 
            onClick={() => handleSkip(-5)}
            title="Rewind 5 seconds"
          >
            <RotateCcw size={18} />
          </button>

          {/* Big Play/Pause Button */}
          <button 
            className="player-main-btn" 
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={20} fill="#ffffff" /> : <Play size={20} fill="#ffffff" style={{ marginLeft: '2px' }} />}
          </button>

          {/* Skip Forward 5s */}
          <button 
            className="card-options-btn" 
            onClick={() => handleSkip(5)}
            title="Fast forward 5 seconds"
          >
            <RotateCw size={18} />
          </button>
        </div>

        {/* Volume icon aesthetic */}
        <div style={{ color: '#64748b' }}>
          <Volume2 size={16} />
        </div>
      </div>
    </div>
  );
};
