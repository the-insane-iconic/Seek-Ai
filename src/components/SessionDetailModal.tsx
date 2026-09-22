import React, { useState, useEffect } from 'react';
import { 
  X, Edit3, Check, Trash2, Download, Copy, Sparkles, 
  RotateCcw, AlertTriangle, Loader2, ArrowRight, CheckCircle2 
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
import { TranscriptView } from './TranscriptView';
import { PrivacyConsentModal } from './PrivacyConsentModal';

interface SessionDetailModalProps {
  session: MemorySession | null;
  isOpen: boolean;
  onClose: () => void;
  onRename: (sessionId: string, newTitle: string) => Promise<void>;
  onDelete: (sessionId: string) => Promise<void>;
  onTranscribe: (session: MemorySession, providerId: string) => Promise<void>;
  onSaveTranscriptEdit: (sessionId: string, newText: string) => Promise<void>;
  onRetryTranscribe: (session: MemorySession) => Promise<void>;
  transcriptionProgress?: {
    status: string;
    percent?: number;
    message?: string;
  } | null;
}

type TabType = 'overview' | 'transcript' | 'phase3';

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  session,
  isOpen,
  onClose,
  onRename,
  onDelete,
  onTranscribe,
  onSaveTranscriptEdit,
  onRetryTranscribe,
  transcriptionProgress,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isDownloading, setIsDownloading] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  // Sync state between AudioPlayer and TranscriptView
  const [currentAudioTimeMs, setCurrentAudioTimeMs] = useState(0);
  const [seekTargetMs, setSeekTargetMs] = useState<number | null>(null);

  useEffect(() => {
    if (session) {
      setEditedTitle(session.title);
      setIsEditingTitle(false);
      setIsDeleting(false);
      // If session already has transcript, switch to transcript tab by default
      if (session.transcript && session.transcript.status === 'completed') {
        setActiveTab('transcript');
      } else {
        setActiveTab('overview');
      }

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

  const handleSeekToSegment = (ms: number) => {
    setSeekTargetMs(ms);
    // Reset seekTarget after slight delay to allow subsequent clicks on the same timestamp
    setTimeout(() => setSeekTargetMs(null), 50);
  };

  const transcript = session.transcript;
  const isTranscribing = transcript?.status === 'waiting' || 
                        transcript?.status === 'uploading' || 
                        transcript?.status === 'transcribing';
  const isFailed = transcript?.status === 'failed';
  const isCompleted = transcript?.status === 'completed';

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        {/* Top Sheet Drag Handle on mobile */}
        <div className="modal-drag-handle-pill" />

        {/* Header bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="phase-tag">SESSION DETAILS</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {formatDuration(session.durationMs)}
            </span>
            {isCompleted && (
              <span className="status-badge-chip success">
                <CheckCircle2 size={11} />
                <span>Transcribed</span>
              </span>
            )}
            {isTranscribing && (
              <span className="status-badge-chip processing">
                <Loader2 size={11} className="spin-icon" />
                <span>Transcribing</span>
              </span>
            )}
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
            <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px', color: '#f8fafc', wordBreak: 'break-word' }}>
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

        {/* Navigation Tabs */}
        <div className="modal-tabs-wrapper">
          <button
            className={`modal-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Audio & Details
          </button>
          <button
            className={`modal-tab-btn ${activeTab === 'transcript' ? 'active' : ''}`}
            onClick={() => setActiveTab('transcript')}
          >
            <span>Transcript</span>
            {isCompleted && <span className="tab-dot-badge" />}
          </button>
          <button
            className={`modal-tab-btn ${activeTab === 'phase3' ? 'active' : ''}`}
            onClick={() => setActiveTab('phase3')}
          >
            Phase 3 AI Preview
          </button>
        </div>

        {/* Dedicated Audio Player Section */}
        <div className="session-audio-section">
          <AudioPlayer 
            src={audioUrl} 
            totalDurationMs={session.durationMs}
            seekToMs={seekTargetMs}
            onTimeUpdate={(ms) => setCurrentAudioTimeMs(ms)}
          />
        </div>

        {/* Transcription Processing Alert / Progress Banner */}
        {isTranscribing && (
          <div className="transcription-progress-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={16} className="spin-icon" color="#818cf8" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                  {transcriptionProgress?.message || 'Transcribing recording...'}
                </span>
              </div>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#a5b4fc', fontWeight: 600 }}>
                {transcriptionProgress?.percent || 30}%
              </span>
            </div>
            <div className="progress-bar-track">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${transcriptionProgress?.percent || 30}%` }} 
              />
            </div>
          </div>
        )}

        {/* Transcription Failed Banner with Retry */}
        {isFailed && (
          <div className="transcription-failed-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <AlertTriangle size={18} color="#ef4444" style={{ marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '13px', color: '#fca5a5' }}>
                  Transcription Failed
                </strong>
                <p style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>
                  {transcript?.error || 'Speech-to-text encountered an issue while processing this session.'}
                </p>
                <button
                  className="btn-retry-transcribe"
                  onClick={() => onRetryTranscribe(session)}
                  id="btn-retry-transcription"
                >
                  <RotateCcw size={13} />
                  <span>Retry Transcription</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: OVERVIEW & TECHNICAL METADATA */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Quick Action: Transcribe if not transcribed */}
            {!isCompleted && !isTranscribing && (
              <div className="transcribe-cta-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="transcribe-cta-icon">
                    <Sparkles size={20} color="#818cf8" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                      Transcribe this Memory
                    </h4>
                    <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                      Convert spoken audio into searchable, timestamped text.
                    </p>
                  </div>
                </div>
                <button
                  className="btn-start-transcribe"
                  onClick={() => setPrivacyModalOpen(true)}
                  id="btn-transcribe-now"
                >
                  <span>Transcribe</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            )}

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

        {/* TAB 2: TRANSCRIPT VIEW */}
        {activeTab === 'transcript' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {isCompleted && transcript ? (
              <TranscriptView
                transcript={transcript}
                currentAudioTimeMs={currentAudioTimeMs}
                onSeekToMs={handleSeekToSegment}
                onSaveEdit={(newText) => onSaveTranscriptEdit(session.id, newText)}
              />
            ) : isTranscribing ? (
              <div className="transcript-empty-placeholder">
                <Loader2 size={32} className="spin-icon" color="#818cf8" />
                <h3>Generating Transcript...</h3>
                <p>Speech-to-text engine is processing timestamps and text.</p>
              </div>
            ) : (
              <div className="transcript-empty-placeholder">
                <Sparkles size={36} color="#6366f1" />
                <h3>No Transcript Yet</h3>
                <p>
                  Transcribe this session to review spoken words, jump to specific moments in audio, and edit text.
                </p>
                <button
                  className="btn-primary"
                  style={{ marginTop: '8px' }}
                  onClick={() => setPrivacyModalOpen(true)}
                  id="btn-tab-transcribe"
                >
                  <Sparkles size={16} />
                  <span>Start Transcription</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PHASE 3 AI PREVIEW */}
        {activeTab === 'phase3' && (
          <div className="phase-preview-card">
            <div className="phase-preview-header">
              <span className="phase-preview-title">Next: Phase 3 AI Pipeline</span>
              <span className="phase-tag">ROADMAP</span>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
              With Phase 2 speech-to-text completed, Phase 3 will analyze these transcripts to extract:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '11px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: '#a5b4fc', fontWeight: 700 }}>Speaker Labels</span>
                <p style={{ color: '#64748b', marginTop: '3px' }}>Identify voices and speakers</p>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: '#a5b4fc', fontWeight: 700 }}>Action Items</span>
                <p style={{ color: '#64748b', marginTop: '3px' }}>Automatic task detection</p>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: '#a5b4fc', fontWeight: 700 }}>Decisions</span>
                <p style={{ color: '#64748b', marginTop: '3px' }}>Key choices and agreements</p>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: '#a5b4fc', fontWeight: 700 }}>Semantic Search</span>
                <p style={{ color: '#64748b', marginTop: '3px' }}>Vector query memory recall</p>
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
              Permanently delete this memory session, audio recording, and transcript?
            </p>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              This cannot be undone. All data will be permanently purged from this device.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn-danger" 
                style={{ flex: 1 }} 
                onClick={handleDeleteConfirm}
                id="btn-confirm-delete"
              >
                Yes, Delete Everything
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

        {/* Privacy Consent Dialog */}
        <PrivacyConsentModal
          isOpen={privacyModalOpen}
          sessionTitle={session.title}
          onClose={() => setPrivacyModalOpen(false)}
          onConfirm={(providerId) => {
            setPrivacyModalOpen(false);
            onTranscribe(session, providerId);
          }}
        />
      </div>
    </div>
  );
};
