import React from 'react';
import { 
  Play, Pause, Calendar, Clock, HardDrive, ChevronRight, 
  FileText, CheckCircle2, Loader2, CheckSquare, Brain,
  Layers, Tag, Users 
} from 'lucide-react';
import { 
  MemorySession, 
  formatDuration, 
  formatSessionDate, 
  formatSessionTime, 
  formatFileSize,
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
  const isTranscribing = transcript && (transcript.status === 'transcribing' || transcript.status === 'uploading' || transcript.status === 'waiting');

  const memory = session.structuredMemory;
  const hasMemory = memory && memory.status === 'completed';

  const segmentsCount = session.conversationSegments?.length || 0;
  const sessionSpeakers = session.speakers || [];

  // Preview snippet from summary or transcript
  const snippet = hasMemory && memory.summary?.oneLiner
    ? memory.summary.oneLiner
    : isTranscribed && transcript.fullText
    ? (transcript.fullText.length > 90 ? transcript.fullText.substring(0, 90) + '...' : transcript.fullText)
    : null;

  const tasksCount = memory?.tasks?.length || 0;
  const completedTasksCount = memory?.tasks?.filter(t => t.completed).length || 0;
  const decisionsCount = memory?.decisions?.length || 0;
  const primaryTopic = memory?.topics?.[0]?.name;

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span className="card-context-pill">
              <Tag size={9} />
              <span>{formatContextLabel(session.contextType, session.customContext)}</span>
            </span>
            {segmentsCount > 1 && (
              <span className="card-segments-pill">
                <Layers size={9} />
                <span>{segmentsCount} Conversations</span>
              </span>
            )}
          </div>
          <h3 className="session-title-text">{session.title}</h3>
        </div>

        <span className="session-badge-duration">
          {formatDuration(session.durationMs)}
        </span>
      </div>

      {/* Structured summary or transcript snippet */}
      {snippet && (
        <div className="session-card-snippet">
          {hasMemory ? <Brain size={12} className="snippet-icon" color="#34d399" /> : <FileText size={12} className="snippet-icon" />}
          <p>{snippet}</p>
        </div>
      )}

      {/* Speaker Chips Preview */}
      {sessionSpeakers.length > 0 && (
        <div className="session-card-speakers-row">
          <Users size={11} color="#94a3b8" />
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {sessionSpeakers.slice(0, 3).map((sp) => (
              <span 
                key={sp.id} 
                className="speaker-chip-pill"
                style={{ borderLeftColor: sp.avatarColor || '#38bdf8' }}
              >
                {sp.isUser ? 'You' : getSpeakerDisplayName(sp)}
              </span>
            ))}
            {sessionSpeakers.length > 3 && (
              <span className="speaker-more-pill">+{sessionSpeakers.length - 3}</span>
            )}
          </div>
        </div>
      )}

      {/* Structured Memory Quick Badges (Tasks, Decisions, Topics) */}
      {hasMemory && (
        <div className="session-card-memory-chips">
          {tasksCount > 0 && (
            <span className="card-memory-chip task">
              <CheckSquare size={10} />
              <span>{completedTasksCount}/{tasksCount} Tasks</span>
            </span>
          )}
          {decisionsCount > 0 && (
            <span className="card-memory-chip decision">
              <CheckCircle2 size={10} />
              <span>{decisionsCount} Decisions</span>
            </span>
          )}
          {primaryTopic && (
            <span className="card-memory-chip topic">
              <span>#{primaryTopic}</span>
            </span>
          )}
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
        {hasMemory ? (
          <span className="session-card-tr-badge memory-ready">
            <Brain size={10} />
            <span>Structured</span>
          </span>
        ) : isTranscribed ? (
          <span className="session-card-tr-badge success">
            <CheckCircle2 size={10} />
            <span>Transcribed</span>
          </span>
        ) : isTranscribing ? (
          <span className="session-card-tr-badge processing">
            <Loader2 size={10} className="spin-icon" />
            <span>Processing</span>
          </span>
        ) : null}
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
