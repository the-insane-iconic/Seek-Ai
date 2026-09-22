import React from 'react';
import { Mic, Radio, Shield, ChevronRight } from 'lucide-react';
import { formatDuration } from '../models/session';

interface StartSessionCardProps {
  isRecording: boolean;
  isPaused: boolean;
  elapsedMs: number;
  onStartSession: () => void;
  onOpenActiveModal: () => void;
}

export const StartSessionCard: React.FC<StartSessionCardProps> = ({
  isRecording,
  isPaused,
  elapsedMs,
  onStartSession,
  onOpenActiveModal,
}) => {
  return (
    <section className="hero-action-section">
      <h2 className="hero-title">Capture Everything Meaningful</h2>

      {isRecording ? (
        <button
          className="btn-start-session active-recording"
          onClick={onOpenActiveModal}
          id="btn-active-session"
        >
          <div className="mic-glow">
            <Radio size={20} />
          </div>
          <span>Session In Progress • {formatDuration(elapsedMs)}</span>
        </button>
      ) : (
        <button
          className="btn-start-session"
          onClick={onStartSession}
          id="btn-start-session"
        >
          <div className="mic-glow">
            <Mic size={20} />
          </div>
          <span>Start Memory Session</span>
        </button>
      )}

      {isRecording && (
        <div 
          className="active-session-strip" 
          onClick={onOpenActiveModal}
          style={{ marginTop: '16px' }}
        >
          <div className="active-strip-left">
            <span className="status-dot" style={{ backgroundColor: '#ef4444' }}></span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>
              {isPaused ? 'Recording Paused' : 'Live Audio Recording'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="active-strip-time">{formatDuration(elapsedMs)}</span>
            <ChevronRight size={16} color="#94a3b8" />
          </div>
        </div>
      )}

      <div className="hero-subtitle">
        <Shield size={13} color="#10b981" />
        <span>100% On-Device Processing • Never Uploaded</span>
      </div>
    </section>
  );
};
