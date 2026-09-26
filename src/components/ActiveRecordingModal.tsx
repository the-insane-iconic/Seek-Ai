import React, { useState } from 'react';
import { Square, Pause, Play, Trash2, X, ShieldAlert, Check } from 'lucide-react';
import { formatDuration } from '../models/session';
import { WaveformVisualizer } from './WaveformVisualizer';

interface ActiveRecordingModalProps {
  isOpen: boolean;
  isPaused: boolean;
  elapsedMs: number;
  level: number;
  frequencyData?: Uint8Array;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onDiscard: () => void;
  onMinimize: () => void;
}

export const ActiveRecordingModal: React.FC<ActiveRecordingModalProps> = ({
  isOpen,
  isPaused,
  elapsedMs,
  level,
  frequencyData,
  onPause,
  onResume,
  onStop,
  onDiscard,
  onMinimize,
}) => {
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        {/* Top bar with minimize button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="recording-badge-live">
            <span className="status-dot" style={{ backgroundColor: isPaused ? '#f59e0b' : '#ef4444' }}></span>
            <span>{isPaused ? 'SESSION PAUSED' : 'LIVE MEMORY SESSION'}</span>
          </div>
          <button 
            className="card-options-btn" 
            onClick={onMinimize} 
            title="Minimize to background (recording continues)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Big Timer */}
        <div className="recording-active-view">
          <div className="recording-timer-big" id="live-timer-display">
            {formatDuration(elapsedMs)}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {isPaused ? 'Recording is paused. Tap resume to continue.' : 'Listening to your environment...'}
          </p>

          {/* Live Waveform Canvas */}
          <WaveformVisualizer 
            isActive={true} 
            isPaused={isPaused} 
            level={level}
            frequencyData={frequencyData}
          />
        </div>

        {/* Discard confirmation or regular controls */}
        {confirmDiscard ? (
          <div style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--record-red)', fontSize: '13px' }}>
              <ShieldAlert size={18} />
              <strong>Discard this session without saving?</strong>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              All audio recorded in this session will be permanently deleted.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                className="btn-danger"
                style={{ flex: 1 }}
                onClick={() => {
                  setConfirmDiscard(false);
                  onDiscard();
                }}
              >
                Yes, Discard
              </button>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setConfirmDiscard(false)}
              >
                Keep Recording
              </button>
            </div>
          </div>
        ) : (
          <div className="recording-controls-grid">
            {/* Discard button */}
            <button
              className="btn-ctrl"
              onClick={() => setConfirmDiscard(true)}
              title="Discard Recording"
              id="btn-discard-session"
            >
              <div className="btn-ctrl-icon discard">
                <Trash2 size={20} />
              </div>
              <span>Discard</span>
            </button>

            {/* Stop & Save button (Primary action) */}
            <button
              className="btn-ctrl"
              onClick={onStop}
              title="Stop and Save Memory Session"
              id="btn-stop-session"
            >
              <div className="btn-ctrl-icon stop-save">
                <Square size={22} color="#ffffff" fill="#ffffff" />
              </div>
              <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>Stop & Save</span>
            </button>

            {/* Pause / Resume button */}
            {isPaused ? (
              <button
                className="btn-ctrl"
                onClick={onResume}
                title="Resume Recording"
                id="btn-resume-session"
              >
                <div className="btn-ctrl-icon" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-main)' }}>
                  <Play size={20} fill="currentColor" />
                </div>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Resume</span>
              </button>
            ) : (
              <button
                className="btn-ctrl"
                onClick={onPause}
                title="Pause Recording"
                id="btn-pause-session"
              >
                <div className="btn-ctrl-icon">
                  <Pause size={20} />
                </div>
                <span>Pause</span>
              </button>
            )}
          </div>
        )}

        {/* Privacy Note */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '11px',
          color: 'var(--text-muted)'
        }}>
          <Check size={12} color="var(--text-muted)" />
          <span>Local storage only. No audio data leaves your device.</span>
        </div>
      </div>
    </div>
  );
};
