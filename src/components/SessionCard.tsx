import React from 'react';
import { Play, Pause, Calendar, Clock, HardDrive, ChevronRight } from 'lucide-react';
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
