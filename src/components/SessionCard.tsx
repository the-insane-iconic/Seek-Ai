import React from 'react';
import { 
  Play, Pause, ChevronRight, CheckCircle2, 
  Layers, Tag, Users 
} from 'lucide-react';
import { 
  MemorySession, 
  formatDuration, 
  formatSessionDate, 
  formatContextLabel,
  getSpeakerDisplayName
} from '../models/session';

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

  const memory = session.structuredMemory;
  const hasMemory = memory && memory.status === 'completed';

  const segmentsCount = session.conversationSegments?.length || 0;
  const sessionSpeakers = session.speakers || [];

  // Preview snippet from summary or transcript
  const snippet = hasMemory && memory.summary?.oneLiner
    ? memory.summary.oneLiner
    : isTranscribed && transcript.fullText
    ? (transcript.fullText.length > 100 ? transcript.fullText.substring(0, 100) + '...' : transcript.fullText)
    : null;

  return (
    <div 
      className="session-card" 
      onClick={() => onSelect(session)}
      role="button"
      tabIndex={0}
      id={`session-card-${session.id}`}
    >
      {/* Top Meta Line: Context, Date, and Duration */}
      <div className="session-card-top-bar">
        <div className="session-card-tags">
          <span className="clean-context-tag">
            <Tag size={10} />
            <span>{formatContextLabel(session.contextType, session.customContext)}</span>
          </span>

          {segmentsCount > 1 && (
            <span className="clean-segments-tag">
              <Layers size={10} />
              <span>{segmentsCount} parts</span>
            </span>
          )}

          <span className="session-card-date">
            {formatSessionDate(session.startTime)}
          </span>
        </div>

        <span className="session-duration-chip">
          {formatDuration(session.durationMs)}
        </span>
      </div>

      {/* Main Content: Title & Summary */}
      <div className="session-card-body">
        <h3 className="session-title-text">{session.title}</h3>
        {snippet && (
          <p className="session-card-snippet-text">{snippet}</p>
        )}
      </div>

      {/* Footer: Speakers, Status & Quick Play */}
      <div className="session-card-footer">
        <div className="session-speakers-chips">
          {sessionSpeakers.length > 0 ? (
            <div className="speakers-flow">
              <Users size={12} color="#71717a" />
              {sessionSpeakers.slice(0, 3).map((sp) => (
                <span key={sp.id} className="clean-speaker-pill">
                  <span 
                    className="speaker-dot" 
                    style={{ backgroundColor: sp.avatarColor || '#a1a1aa' }} 
                  />
                  <span>{getSpeakerDisplayName(sp)}</span>
                </span>
              ))}
              {sessionSpeakers.length > 3 && (
                <span className="more-speakers-pill">+{sessionSpeakers.length - 3}</span>
              )}
            </div>
          ) : isTranscribed ? (
            <span className="status-indicator-clean">
              <CheckCircle2 size={11} color="#10b981" />
              <span>Transcribed</span>
            </span>
          ) : (
            <span className="status-indicator-clean muted">Audio Recorded</span>
          )}
        </div>

        <div className="session-card-actions" onClick={(e) => e.stopPropagation()}>
          <button 
            className={`quick-play-btn ${isQuickPlaying ? 'is-playing' : ''}`}
            onClick={() => onPlayQuick(session)}
            title={isQuickPlaying ? 'Pause Audio' : 'Play Audio Preview'}
            aria-label={isQuickPlaying ? 'Pause Audio' : 'Play Audio'}
          >
            {isQuickPlaying ? (
              <Pause size={12} fill="currentColor" />
            ) : (
              <Play size={12} fill="currentColor" style={{ marginLeft: '1px' }} />
            )}
          </button>

          <button 
            className="chevron-open-btn"
            onClick={() => onSelect(session)}
            title="Open Details"
            aria-label="Open Details"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
