import React from 'react';
import { Mic, Shield, ChevronRight } from 'lucide-react';
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
      <div className="hero-card-inner">
        <div className="hero-text-block">
          <span className="hero-eyebrow">Local Audio System</span>
          <h2 className="hero-title">Audio Notes & Transcription</h2>
          <p className="hero-desc">
            Record meetings, interviews, or lectures. Audio is indexed on-device into searchable text, speakers, and action items.
          </p>
        </div>

        {isRecording ? (
          <div className="recording-control-panel">
            <button
              className="btn-recording-action is-recording"
              onClick={onOpenActiveModal}
              id="btn-active-session"
              aria-label="View Active Recording"
            >
              <span className="record-live-dot" />
              <div className="recording-info-col">
                <span className="recording-status-title">
                  {isPaused ? 'Recording Paused' : 'Live Recording'}
                </span>
                <span className="recording-timer-text">{formatDuration(elapsedMs)}</span>
              </div>
              <ChevronRight size={18} className="chevron-icon" />
            </button>
          </div>
        ) : (
          <div className="start-control-panel">
            <button
              className="btn-start-record"
              onClick={onStartSession}
              id="btn-start-session"
            >
              <div className="record-circle-icon">
                <Mic size={18} />
              </div>
              <span>Start Recording</span>
            </button>
          </div>
        )}

        <div className="hero-privacy-note">
          <Shield size={13} />
          <span>Local storage only • Zero external telemetry</span>
        </div>
      </div>
    </section>
  );
};
