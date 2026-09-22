import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2 } from 'lucide-react';
import { formatDuration } from '../models/session';

interface AudioPlayerProps {
  src: string | null;
  totalDurationMs?: number;
  autoPlay?: boolean;
  seekToMs?: number | null;
  onTimeUpdate?: (currentTimeMs: number) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  totalDurationMs = 0,
  autoPlay = false,
  seekToMs = null,
  onTimeUpdate
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

  // Handle external seek requests from transcript segment clicks
  useEffect(() => {
    if (seekToMs !== null && seekToMs !== undefined && audioRef.current) {
      const targetSec = seekToMs / 1000;
      audioRef.current.currentTime = targetSec;
      setCurrentTimeMs(seekToMs);
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [seekToMs]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const ms = audio.currentTime * 1000;
      setCurrentTimeMs(ms);
      onTimeUpdate?.(ms);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDurationMs(audio.duration * 1000);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTimeMs(0);
      onTimeUpdate?.(0);
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
  }, [src, autoPlay, onTimeUpdate]);

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
    onTimeUpdate?.(targetMs);
    if (audioRef.current) {
      audioRef.current.currentTime = targetMs / 1000;
    }
  };

  const handleSkip = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, (durationMs || 1000) / 1000));
    audioRef.current.currentTime = newTime;
    const ms = newTime * 1000;
    setCurrentTimeMs(ms);
    onTimeUpdate?.(ms);
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
          aria-label="Playback speed"
        >
          {playbackRate}x
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Skip Back 5s */}
          <button 
            className="player-control-icon-btn" 
            onClick={() => handleSkip(-5)}
            title="Rewind 5 seconds"
            aria-label="Rewind 5 seconds"
          >
            <RotateCcw size={18} />
          </button>

          {/* Big Play/Pause Button */}
          <button 
            className="player-main-btn" 
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={20} fill="#ffffff" /> : <Play size={20} fill="#ffffff" style={{ marginLeft: '2px' }} />}
          </button>

          {/* Skip Forward 5s */}
          <button 
            className="player-control-icon-btn" 
            onClick={() => handleSkip(5)}
            title="Fast forward 5 seconds"
            aria-label="Fast forward 5 seconds"
          >
            <RotateCw size={18} />
          </button>
        </div>

        {/* Volume icon aesthetic */}
        <div style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
          <Volume2 size={16} />
        </div>
      </div>
    </div>
  );
};
