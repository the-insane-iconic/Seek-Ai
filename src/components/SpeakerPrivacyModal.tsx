import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Trash2, Edit3, X, AlertTriangle, Lock 
} from 'lucide-react';
import { SpeakerProfile } from '../models/session';
import { databaseService } from '../services/storage/database';

interface SpeakerPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpeakersUpdated?: () => void;
}

export const SpeakerPrivacyModal: React.FC<SpeakerPrivacyModalProps> = ({
  isOpen,
  onClose,
  onSpeakersUpdated,
}) => {
  const [speakers, setSpeakers] = useState<SpeakerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIsUser, setEditIsUser] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const loadSpeakers = async () => {
    setIsLoading(true);
    try {
      const list = await databaseService.getAllSpeakerProfiles();
      setSpeakers(list);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSpeakers();
      setConfirmWipe(false);
      setEditingId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartEdit = (sp: SpeakerProfile) => {
    setEditingId(sp.id);
    setEditName(sp.name || sp.label);
    setEditIsUser(sp.isUser);
  };

  const handleSaveEdit = async (sp: SpeakerProfile) => {
    const updated: SpeakerProfile = {
      ...sp,
      name: editName.trim(),
      isUser: editIsUser,
      confidence: 1.0,
      updatedAt: Date.now()
    };
    await databaseService.saveSpeakerProfile(updated);
    setEditingId(null);
    await loadSpeakers();
    onSpeakersUpdated?.();
  };

  const handleDeleteSpeaker = async (id: string) => {
    await databaseService.deleteSpeakerProfile(id);
    await loadSpeakers();
    onSpeakersUpdated?.();
  };

  const handleWipeAll = async () => {
    await databaseService.clearAllSpeakerProfiles();
    setConfirmWipe(false);
    await loadSpeakers();
    onSpeakersUpdated?.();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" style={{ zIndex: 140 }}>
      <div className="modal-sheet" style={{ maxWidth: '520px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="modal-icon-badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Speaker & Voice Privacy
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                On-device voice profiles and identity control
              </span>
            </div>
          </div>
          <button className="card-options-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Privacy Banner */}
        <div className="privacy-card-banner" style={{ marginTop: '14px' }}>
          <Lock size={15} color="var(--text-main)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text-main)' }}>Your Voice Identity Stays Private.</strong>
            <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)' }}>
              Diarization mappings and speaker names are stored exclusively on your device in local IndexedDB. 
              You can correct, rename, or permanently delete any profile at any time.
            </p>
          </div>
        </div>

        {/* Speakers List */}
        <div style={{ flex: 1, overflowY: 'auto', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              SAVED PROFILES ({speakers.length})
            </span>
            {speakers.length > 0 && !confirmWipe && (
              <button
                className="section-add-btn"
                onClick={() => setConfirmWipe(true)}
                style={{ color: 'var(--record-red)' }}
                title="Delete all stored speaker profiles"
              >
                <Trash2 size={12} />
                <span>Delete All</span>
              </button>
            )}
          </div>

          {confirmWipe && (
            <div className="privacy-wipe-confirm-box" style={{ background: '#fff1f2', border: '1px solid #fecdd3' }}>
              <AlertTriangle size={14} color="var(--record-red)" />
              <span style={{ fontSize: '12px', color: 'var(--record-red)', flex: 1, fontWeight: 600 }}>
                Permanently erase all voice profiles?
              </span>
              <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setConfirmWipe(false)}>
                Cancel
              </button>
              <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={handleWipeAll}>
                Yes, Wipe All
              </button>
            </div>
          )}

          {isLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Loading speaker profiles...
            </div>
          ) : speakers.length === 0 ? (
            <div className="memory-empty-category" style={{ padding: '32px 16px' }}>
              No speaker profiles stored yet. When you record sessions and identify speakers ("Speaker 1 → Rahul"), they will appear here under your full control.
            </div>
          ) : (
            speakers.map(sp => {
              const isEditing = editingId === sp.id;
              const displayName = sp.isUser ? 'You' : (sp.name || sp.label);

              return (
                <div key={sp.id} className="speaker-profile-card">
                  <div 
                    className="person-avatar" 
                    style={{ background: sp.avatarColor || 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>

                  {isEditing ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        className="input-field-text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="Speaker name"
                        style={{ padding: '6px 10px', fontSize: '13px' }}
                        autoFocus
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={editIsUser}
                          onChange={e => setEditIsUser(e.target.checked)}
                        />
                        <span>This is me (Owner / You)</span>
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                        <button className="btn-primary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleSaveEdit(sp)}>
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                          {displayName}
                        </span>
                        {sp.isUser && (
                          <span className="is-user-tag">YOU</span>
                        )}
                        {sp.confidence && (
                          <span className="speaker-conf-tag">
                            {Math.round(sp.confidence * 100)}% match
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Label: {sp.label} • {sp.associatedSessionCount || 1} sessions
                      </span>
                    </div>
                  )}

                  {!isEditing && (
                    <div className="item-action-buttons">
                      <button 
                        className="card-options-btn"
                        onClick={() => handleStartEdit(sp)}
                        title="Edit speaker"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button 
                        className="card-options-btn delete"
                        onClick={() => handleDeleteSpeaker(sp.id)}
                        title="Delete speaker profile"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-sheet-actions" style={{ marginTop: '16px', borderTop: '1px solid #1e293b', paddingTop: '12px' }}>
          <button className="btn-primary" onClick={onClose} style={{ width: '100%' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
