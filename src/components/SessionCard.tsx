import React from 'react';
import { Play, Pause, Calendar, Clock, HardDrive, ChevronRight, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { MemorySession, formatDuration, formatSessionDate, formatSessionTime, formatFileSize } from '../models/session';

interface SessionCardProps {
  session: MemorySession;
  onSelect: (session: MemorySession) => void;
  onPlayQuick: (session: MemorySession) => void;
  isQuickPlaying?: boolean;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onSelect,
  onPlayQuick,
  isQuickPlaying = false
}) => {
  const transcript = session.transcript;
  const isTranscribed = transcript && transcript.status === 'completed';
  const isTranscribing = transcript && (transcript.status === 'transcribing' || transcript.status === 'uploading' || transcript.status === 'waiting');

  // Preview snippet from transcript if available
  const snippet = isTranscribed && transcript.fullText
    ? (transcript.fullText.length > 90 ? transcript.fullText.substring(0, 90) + '...' : transcript.fullText)
    : null;

  return (
    <div 
      className="session-card" 
      onClick={() => onSelect(session)}
      role="button"
      tabIndex={0}
      id={`session-card-${session.id}`}
    >
      {/* Header: Title and Duration pill */}
      <div className="session-card-header">
        <h3 className="session-title-text">{session.title}</h3>
        <span className="session-badge-duration">
          {formatDuration(session.durationMs)}
        </span>
      </div>

      {/* Transcript snippet if available */}
      {snippet && (
        <div className="session-card-snippet">
          <FileText size={12} className="snippet-icon" />
          <p>{snippet}</p>
        </div>
      )}

      {/* Metadata items */}
      <div className="session-card-meta">
        <div className="meta-item">
          <Calendar size={13} />
          <span>{formatSessionDate(session.startTime)}</span>
        </div>
        <div className="meta-item">
          <Clock size={13} />
          <span>{formatSessionTime(session.startTime)}</span>
        </div>
        <div className="meta-item">
          <HardDrive size={13} />
          <span>{formatFileSize(session.audioSizeBytes)}</span>
        </div>

        {/* Status chip */}
        {isTranscribed && (
          <span className="session-card-tr-badge success">
            <CheckCircle2 size={10} />
            <span>Transcribed</span>
          </span>
        )}
        {isTranscribing && (
          <span className="session-card-tr-badge processing">
            <Loader2 size={10} className="spin-icon" />
            <span>Processing</span>
          </span>
        )}
      </div>

      {/* Footer: Quick Play button and Detail indicator */}
      <div className="session-card-footer">
        <button
          className={`quick-play-btn ${isQuickPlaying ? 'is-playing' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onPlayQuick(session);
          }}
          title={isQuickPlaying ? 'Pause preview' : 'Quick listen'}
        >
          {isQuickPlaying ? <Pause size={13} /> : <Play size={13} />}
          <span>{isQuickPlaying ? 'Playing' : 'Quick Listen'}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#6366f1' }}>
          <span>Details</span>
          <ChevronRight size={14} />
        </div>
      </div>
    </div>
  );
};
