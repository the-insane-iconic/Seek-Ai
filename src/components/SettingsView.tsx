import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Trash2, Edit3, 
  RotateCcw, Check, X, Users, Database, AlertTriangle 
} from 'lucide-react';
import { SpeakerProfile, formatFileSize, MemorySession } from '../models/session';
import { databaseService } from '../services/storage/database';
import { memoryVectorIndexService } from '../services/search/MemoryVectorIndexService';

interface SettingsViewProps {
  sessions: MemorySession[];
  totalStorageBytes: number;
  onRefreshData: () => Promise<any>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  sessions,
  totalStorageBytes,
  onRefreshData,
}) => {
  const [speakers, setSpeakers] = useState<SpeakerProfile[]>([]);
  const [vectorStats, setVectorStats] = useState<{ totalVectors: number; indexedSessions: number }>({ totalVectors: 0, indexedSessions: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isReindexing, setIsReindexing] = useState(false);
  const [reindexSuccess, setReindexSuccess] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const loadData = async () => {
    try {
      const sps = await databaseService.getAllSpeakerProfiles();
      setSpeakers(sps);
      const vStats = await databaseService.getVectorStats();
      setVectorStats(vStats);
    } catch (err) {
      console.error('Failed to load settings data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [sessions]);

  const handleStartEdit = (sp: SpeakerProfile) => {
    setEditingId(sp.id);
    setEditName(sp.name || sp.label);
  };

  const handleSaveEdit = async (spId: string) => {
    if (!editName.trim()) return;
    try {
      const existing = speakers.find(s => s.id === spId);
      if (existing) {
        await databaseService.saveSpeakerProfile({
          ...existing,
          name: editName.trim(),
          updatedAt: Date.now()
        });
      }
      setEditingId(null);
      await loadData();
      await onRefreshData();
    } catch (err) {
      console.error('Failed to save speaker edit:', err);
    }
  };

  const handleToggleUser = async (sp: SpeakerProfile) => {
    try {
      const isNowUser = !sp.isUser;
      // If setting to true, un-toggle other users
      if (isNowUser) {
        for (const other of speakers) {
          if (other.isUser && other.id !== sp.id) {
            await databaseService.saveSpeakerProfile({ ...other, isUser: false });
          }
        }
      }
      await databaseService.saveSpeakerProfile({
        ...sp,
        isUser: isNowUser,
        name: isNowUser ? 'You' : sp.name,
        updatedAt: Date.now()
      });
      await loadData();
      await onRefreshData();
    } catch (err) {
      console.error('Failed to toggle user:', err);
    }
  };

  const handleDeleteSpeaker = async (spId: string) => {
    try {
      await databaseService.deleteSpeakerProfile(spId);
      await loadData();
      await onRefreshData();
    } catch (err) {
      console.error('Failed to delete speaker:', err);
    }
  };

  const handleReindex = async () => {
    setIsReindexing(true);
    setReindexSuccess(false);
    try {
      await memoryVectorIndexService.reindexAllSessions(sessions);
      await loadData();
      setReindexSuccess(true);
      setTimeout(() => setReindexSuccess(false), 3000);
    } catch (err) {
      console.error('Reindexing failed:', err);
    } finally {
      setIsReindexing(false);
    }
  };

  const handleClearAllData = async () => {
    try {
      await databaseService.clearAllSpeakerProfiles();
      await databaseService.clearAllVectorRecords();
      await databaseService.clearAssistantMessages();
      for (const s of sessions) {
        await databaseService.deleteSession(s.id);
      }
      setConfirmClearAll(false);
      await loadData();
      await onRefreshData();
    } catch (err) {
      console.error('Failed to clear data:', err);
    }
  };

  return (
    <div className="settings-view-container">
      {/* 1. Storage & Vector Index Stats */}
      <section className="settings-card">
        <div className="settings-card-header">
          <Database size={16} color="#71717a" />
          <h3>Storage & Intelligence</h3>
        </div>

        <div className="settings-stats-grid">
          <div className="stat-tile">
            <span className="stat-tile-label">Recorded Audio</span>
            <span className="stat-tile-val">{formatFileSize(totalStorageBytes)}</span>
            <span className="stat-tile-sub">{sessions.length} sessions stored</span>
          </div>

          <div className="stat-tile">
            <span className="stat-tile-label">Indexed Memories</span>
            <span className="stat-tile-val">{vectorStats.totalVectors}</span>
            <span className="stat-tile-sub">across {vectorStats.indexedSessions} sessions</span>
          </div>
        </div>

        <div className="settings-action-row">
          <button 
            className="settings-action-btn"
            onClick={handleReindex}
            disabled={isReindexing || sessions.length === 0}
          >
            <RotateCcw size={13} className={isReindexing ? 'spin-icon' : ''} />
            <span>{isReindexing ? 'Rebuilding Index...' : 'Re-index Memories'}</span>
          </button>
          {reindexSuccess && (
            <span className="success-badge">
              <Check size={12} /> Index Updated
            </span>
          )}
        </div>
      </section>

      {/* 2. Speaker & Voice Identity Manager */}
      <section className="settings-card">
        <div className="settings-card-header">
          <Users size={16} color="#71717a" />
          <h3>Voice & Speaker Profiles</h3>
        </div>
        <p className="settings-card-desc">
          Speakers recognized across your sessions. Identified profiles are saved on-device so future conversations automatically recognize who is speaking.
        </p>

        <div className="speakers-list-wrap">
          {speakers.length === 0 ? (
            <div className="speakers-empty-msg">
              No speaker profiles stored yet. Transcribe and diarize a session to detect speakers.
            </div>
          ) : (
            speakers.map(sp => {
              const isEditing = editingId === sp.id;
              return (
                <div key={sp.id} className="speaker-profile-row">
                  <div 
                    className="speaker-avatar-circle"
                    style={{ backgroundColor: sp.avatarColor || '#38bdf8' }}
                  >
                    {(sp.name || sp.label).charAt(0).toUpperCase()}
                  </div>

                  <div className="speaker-info-col">
                    {isEditing ? (
                      <div className="speaker-edit-inline">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="speaker-rename-input"
                          autoFocus
                        />
                        <button className="icon-save-btn" onClick={() => handleSaveEdit(sp.id)}>
                          <Check size={13} />
                        </button>
                        <button className="icon-cancel-btn" onClick={() => setEditingId(null)}>
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="speaker-name-row">
                        <span className="speaker-name-text">{sp.name || sp.label}</span>
                        {sp.isUser && <span className="you-badge-chip">YOU</span>}
                      </div>
                    )}
                    <span className="speaker-sessions-meta">
                      {sp.associatedSessionCount || 1} session{(sp.associatedSessionCount || 1) > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="speaker-row-actions">
                    <button
                      className={`pill-toggle-btn ${sp.isUser ? 'is-active' : ''}`}
                      onClick={() => handleToggleUser(sp)}
                      title="Set as You"
                    >
                      {sp.isUser ? 'My Voice' : 'Set as Me'}
                    </button>

                    {!isEditing && (
                      <button 
                        className="speaker-icon-btn" 
                        onClick={() => handleStartEdit(sp)}
                        title="Rename Speaker"
                      >
                        <Edit3 size={13} />
                      </button>
                    )}

                    <button 
                      className="speaker-icon-btn delete" 
                      onClick={() => handleDeleteSpeaker(sp.id)}
                      title="Permanently Delete Profile"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 3. Privacy & Data Wipe */}
      <section className="settings-card danger-zone">
        <div className="settings-card-header">
          <ShieldCheck size={16} color="#71717a" />
          <h3>Data & Privacy</h3>
        </div>
        <p className="settings-card-desc">
          All audio recordings, transcripts, structured memories, speaker profiles, and vector embeddings are stored locally on your device in IndexedDB.
        </p>

        {confirmClearAll ? (
          <div className="confirm-wipe-box">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AlertTriangle size={16} color="#ef4444" />
              <span>Are you sure? This permanently wipes all sessions and memory data.</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button className="btn-danger-confirm" onClick={handleClearAllData}>
                Yes, Delete Everything
              </button>
              <button className="btn-cancel" onClick={() => setConfirmClearAll(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button 
            className="btn-danger-outline"
            onClick={() => setConfirmClearAll(true)}
          >
            <Trash2 size={13} />
            <span>Clear All Stored Memory Data</span>
          </button>
        )}
      </section>
    </div>
  );
};
