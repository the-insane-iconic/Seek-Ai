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
      <div className="hero-card-inner">
        <div className="hero-text-block">
          <span className="hero-eyebrow">Personal Audio Intelligence</span>
          <h2 className="hero-title">Capture Everything Meaningful</h2>
          <p className="hero-desc">
            Record meetings, lectures, and daily conversations into structured, searchable memories.
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
              <div className="record-pulse-ring" />
              <Radio size={22} className="record-icon" />
              <div className="recording-info-col">
                <span className="recording-status-title">
                  {isPaused ? 'Recording Paused' : 'Listening & Recording'}
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
                <Mic size={22} />
              </div>
              <span>Start Memory Session</span>
            </button>
          </div>
        )}

        <div className="hero-privacy-note">
          <Shield size={12} color="#71717a" />
          <span>On-device processing • Complete privacy</span>
        </div>
      </div>
    </section>
  );
};
