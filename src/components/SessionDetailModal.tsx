import React, { useState, useEffect } from 'react';
import { 
  X, Edit3, Check, Trash2, Download, Copy 
} from 'lucide-react';
import { 
  MemorySession, 
  formatDuration, 
  formatSessionDate, 
  formatSessionTime, 
  formatFileSize 
} from '../models/session';
import { audioFileManager } from '../services/storage/audioFileManager';
import { AudioPlayer } from './AudioPlayer';

interface SessionDetailModalProps {
  session: MemorySession | null;
  isOpen: boolean;
  onClose: () => void;
  onRename: (sessionId: string, newTitle: string) => Promise<void>;
  onDelete: (sessionId: string) => Promise<void>;
}

type TabType = 'audio' | 'transcript' | 'speakers' | 'memory' | 'ai';

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  session,
  isOpen,
  onClose,
  onRename,
  onDelete,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('audio');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (session) {
      setEditedTitle(session.title);
      setIsEditingTitle(false);
      setIsDeleting(false);
      setActiveTab('audio');

      // Fetch ObjectURL for audio playback
      audioFileManager.getPlaybackUrl(session.id).then(url => {
        setAudioUrl(url);
      });
    } else {
      setAudioUrl(null);
    }
  }, [session]);

  if (!isOpen || !session) return null;

  const handleSaveTitle = async () => {
    if (editedTitle.trim() && editedTitle !== session.title) {
      await onRename(session.id, editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(session.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await audioFileManager.downloadAudio(session.id, session.title);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    await onDelete(session.id);
    onClose();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        {/* Header bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="phase-tag">SESSION DETAILS</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {formatDuration(session.durationMs)}
            </span>
          </div>
          <button className="card-options-btn" onClick={onClose} title="Close details">
            <X size={20} />
          </button>
        </div>

        {/* Title editing section */}
        {isEditingTitle ? (
          <div className="title-edit-wrapper">
            <input
              type="text"
              className="title-input"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              id="input-session-title"
            />
            <button className="btn-save-title" onClick={handleSaveTitle} id="btn-save-title">
              <Check size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px', color: '#f8fafc' }}>
              {session.title}
            </h2>
            <button
              className="card-options-btn"
              onClick={() => setIsEditingTitle(true)}
              title="Rename session"
              id="btn-rename-session"
            >
              <Edit3 size={17} />
            </button>
          </div>
        )}

        {/* Navigation Tabs: Audio & Future Pipeline Previews */}
        <div style={{
          display: 'flex',
          gap: '4px',
          background: 'rgba(0,0,0,0.3)',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid var(--border-subtle)',
          overflowX: 'auto'
        }}>
          <button
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'audio' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'audio' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setActiveTab('audio')}
          >
            Audio & Details
          </button>
          <button
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'transcript' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              color: activeTab === 'transcript' ? '#a5b4fc' : 'var(--text-muted)',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setActiveTab('transcript')}
          >
            Transcript (P2)
          </button>
          <button
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'memory' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              color: activeTab === 'memory' ? '#a5b4fc' : 'var(--text-muted)',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setActiveTab('memory')}
          >
            Structured AI (P2)
          </button>
        </div>

        {/* Tab 1: Audio Playback & Technical Metadata */}
        {activeTab === 'audio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Audio Player */}
            <AudioPlayer src={audioUrl} totalDurationMs={session.durationMs} />

            {/* Metadata Grid */}
            <div className="metadata-grid">
              <div className="meta-field">
                <span className="meta-field-label">Start Time</span>
                <span className="meta-field-value">
                  {formatSessionDate(session.startTime)} • {formatSessionTime(session.startTime)}
                </span>
              </div>
              <div className="meta-field">
                <span className="meta-field-label">End Time</span>
                <span className="meta-field-value">
                  {formatSessionTime(session.endTime)}
                </span>
              </div>
              <div className="meta-field">
                <span className="meta-field-label">Duration</span>
                <span className="meta-field-value">
                  {formatDuration(session.durationMs)}
                </span>
              </div>
              <div className="meta-field">
                <span className="meta-field-label">Format / Size</span>
                <span className="meta-field-value">
                  {formatFileSize(session.audioSizeBytes)} ({session.audioMimeType.split(';')[0]})
                </span>
              </div>
              <div className="meta-field" style={{ gridColumn: 'span 2' }}>
                <span className="meta-field-label">Storage Reference</span>
                <span className="meta-field-value" style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {session.audioStorageKey}
                </span>
              </div>
              <div className="meta-field" style={{ gridColumn: 'span 2' }}>
                <span className="meta-field-label">Session ID</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <span className="meta-field-value" style={{ fontSize: '11px', color: '#a5b4fc' }}>
                    {session.id}
                  </span>
                  <button
                    className="card-options-btn"
                    onClick={handleCopyId}
                    title="Copy unique ID"
                    style={{ padding: '2px 6px', fontSize: '11px' }}
                  >
                    {copiedId ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Future Phase 2 Preview - Transcription & Speakers */}
        {activeTab === 'transcript' && (
          <div className="phase-preview-card">
            <div className="phase-preview-header">
              <span className="phase-preview-title">Speech-to-Text & Speaker Diarization</span>
              <span className="phase-tag">PHASE 2 TARGET</span>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
              The Session data model in <code style={{ color: '#a5b4fc' }}>src/models/session.ts</code> already contains pre-allocated interfaces (<code style={{ color: '#a5b4fc' }}>TranscriptData</code>, <code style={{ color: '#a5b4fc' }}>SpeakerProfile</code>) ready to ingest Whisper or native speech recognition results in Phase 2.
            </p>
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '8px',
              padding: '12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: '#cbd5e1'
            }}>
              <span style={{ color: '#6ee7b7' }}>// Phase 2 Extension Point:</span><br/>
              await speechToTextService.transcribe(session.audioBlob);<br/>
              session.transcript = &#123; segments, language: 'en' &#125;;
            </div>
          </div>
        )}

        {/* Tab 3: Future Phase 2 Preview - Structured Memory & AI */}
        {activeTab === 'memory' && (
          <div className="phase-preview-card">
            <div className="phase-preview-header">
              <span className="phase-preview-title">Structured Memory & Semantic Search</span>
              <span className="phase-tag">PHASE 2 TARGET</span>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
              In Phase 2, this audio and its transcript will automatically be analyzed to extract action items, key decisions, topics, and vector embeddings for semantic recall without altering Phase 1 storage foundations.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              fontSize: '11px'
            }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px' }}>
                <span style={{ color: '#a5b4fc', fontWeight: 600 }}>Action Items</span>
                <p style={{ color: '#64748b', marginTop: '2px' }}>Automatic task extraction</p>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px' }}>
                <span style={{ color: '#a5b4fc', fontWeight: 600 }}>Key Decisions</span>
                <p style={{ color: '#64748b', marginTop: '2px' }}>Contextual memory log</p>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation or action buttons */}
        {isDeleting ? (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <p style={{ fontSize: '13px', color: '#fca5a5', fontWeight: 600 }}>
              Permanently delete this memory session and audio file?
            </p>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              This cannot be undone. All audio blobs and metadata stored locally will be permanently purged.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn-danger" 
                style={{ flex: 1 }} 
                onClick={handleDeleteConfirm}
                id="btn-confirm-delete"
              >
                Yes, Permanently Delete
              </button>
              <button 
                className="btn-secondary" 
                style={{ flex: 1 }} 
                onClick={() => setIsDeleting(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="modal-actions-row">
            {/* Download audio */}
            <button
              className="btn-secondary"
              onClick={handleDownload}
              disabled={isDownloading}
              title="Download audio recording to device"
              id="btn-download-audio"
            >
              <Download size={15} />
              <span>{isDownloading ? 'Exporting...' : 'Export Audio'}</span>
            </button>

            {/* Delete session */}
            <button
              className="btn-danger"
              onClick={() => setIsDeleting(true)}
              title="Delete session"
              id="btn-delete-session"
            >
              <Trash2 size={15} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
