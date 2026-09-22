import React, { useState } from 'react';
import { Search, MicOff } from 'lucide-react';
import { MemorySession, formatDuration, formatFileSize } from '../models/session';
import { SessionCard } from './SessionCard';

interface SessionListProps {
  sessions: MemorySession[];
  onSelectSession: (session: MemorySession) => void;
  onPlayQuick: (session: MemorySession) => void;
  playingSessionId: string | null;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  onSelectSession,
  onPlayQuick,
  playingSessionId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter(s => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return s.title.toLowerCase().includes(query);
  });

  const totalDurationMs = sessions.reduce((acc, s) => acc + (s.durationMs || 0), 0);
  const totalSizeBytes = sessions.reduce((acc, s) => acc + (s.audioSizeBytes || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Aggregated Statistics Summary */}
      {sessions.length > 0 && (
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-label">Sessions</span>
            <span className="stat-value">{sessions.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Time</span>
            <span className="stat-value">{formatDuration(totalDurationMs)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Storage</span>
            <span className="stat-value">{formatFileSize(totalSizeBytes)}</span>
          </div>
        </div>
      )}

      {/* Section Header */}
      <div className="section-header">
        <div className="section-title-group">
          <h2 className="section-title">Previous Memories</h2>
          <span className="section-count">({sessions.length})</span>
        </div>
      </div>

      {/* Search Input (visible if at least 2 sessions exist) */}
      {sessions.length > 1 && (
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search sessions by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="search-sessions-input"
          />
        </div>
      )}

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <MicOff size={24} />
          </div>
          <h3>No Memory Sessions Yet</h3>
          <p>
            Tap "Start Memory Session" above to begin recording your thoughts, meetings, or reflections. Audio stays private on this device.
          </p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="empty-state" style={{ padding: '32px 20px' }}>
          <p>No sessions match "{searchQuery}"</p>
          <button
            className="btn-secondary"
            style={{ marginTop: '10px' }}
            onClick={() => setSearchQuery('')}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="session-list">
          {filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onSelect={onSelectSession}
              onPlayQuick={onPlayQuick}
              isQuickPlaying={playingSessionId === session.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};
