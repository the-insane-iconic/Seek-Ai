import React, { useState, useEffect } from 'react';
import { 
  X, Edit3, Check, Trash2, Download, Copy, 
  RotateCcw, AlertTriangle, Loader2, ArrowRight, CheckCircle2,
  Brain, FileText, Settings2, Users, ShieldCheck, Tag, ChevronDown
} from 'lucide-react';
import { 
  MemorySession, 
  formatDuration, 
  formatSessionDate, 
  formatSessionTime, 
  formatFileSize,
  StructuredMemory,
  ConversationContextType,
  formatContextLabel,
  CONTEXT_LABELS,
  getSpeakerColor,
  getSpeakerDisplayName
} from '../models/session';
import { audioFileManager } from '../services/storage/audioFileManager';
import { AudioPlayer } from './AudioPlayer';
import { TranscriptView } from './TranscriptView';
import { StructuredMemoryView } from './StructuredMemoryView';
import { PrivacyConsentModal } from './PrivacyConsentModal';
import { ConversationSegmentNavigator } from './ConversationSegmentNavigator';
import { SpeakerPrivacyModal } from './SpeakerPrivacyModal';

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

  // Phase 3 Memory Extraction Props
  onExtractMemory: (session: MemorySession, providerId?: string) => Promise<void>;
  onToggleTask: (sessionId: string, taskId: string, completed: boolean) => Promise<void>;
  onUpdateEntity: (sessionId: string, category: keyof StructuredMemory, itemId: string, fields: any) => Promise<void>;
  onDeleteEntity: (sessionId: string, category: keyof StructuredMemory, itemId: string) => Promise<void>;
  onAddEntity: (sessionId: string, category: keyof StructuredMemory, item: any) => Promise<void>;
  isExtractingMemory?: boolean;

  // Phase 4 Segmentation & Speaker Props
  onRenameSpeaker?: (sessionId: string, speakerId: string, newName: string, isUser?: boolean) => Promise<void>;
  onRenameSegment?: (sessionId: string, segmentId: string, newTitle: string, contextType: ConversationContextType) => Promise<void>;
  onSplitSegment?: (sessionId: string, segmentId: string, splitTimeMs: number, newTitle?: string) => Promise<void>;
  onMergeSegments?: (sessionId: string, segmentId1: string, segmentId2: string) => Promise<void>;
  onUpdateContext?: (sessionId: string, contextType: ConversationContextType, customContext?: string) => Promise<void>;
  initialSeekMs?: number;
}

type TabType = 'memory' | 'transcript' | 'speakers' | 'technical';

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
  onExtractMemory,
  onToggleTask,
  onUpdateEntity,
  onDeleteEntity,
  onAddEntity,
  isExtractingMemory = false,
  onRenameSpeaker,
  onRenameSegment,
  onSplitSegment,
  onMergeSegments,
  onUpdateContext,
  initialSeekMs,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('memory');
  const [isDownloading, setIsDownloading] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  // Phase 4 State
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [editingContext, setEditingContext] = useState(false);
  const [speakerPrivacyModalOpen, setSpeakerPrivacyModalOpen] = useState(false);

  const [speakerRenameId, setSpeakerRenameId] = useState<string | null>(null);
  const [speakerRenameText, setSpeakerRenameText] = useState('');
  const [speakerRenameIsUser, setSpeakerRenameIsUser] = useState(false);

  // Sync state between AudioPlayer, TranscriptView, and StructuredMemoryView
  const [currentAudioTimeMs, setCurrentAudioTimeMs] = useState(0);
  const [seekTargetMs, setSeekTargetMs] = useState<number | null>(null);

  useEffect(() => {
    if (session) {
      setEditedTitle(session.title);
      setIsEditingTitle(false);
      setIsDeleting(false);
      setEditingContext(false);

      if (initialSeekMs !== undefined && initialSeekMs > 0) {
        setSeekTargetMs(initialSeekMs);
        setActiveTab('transcript');
      } else if (session.structuredMemory && session.structuredMemory.status === 'completed') {
        setActiveTab('memory');
      } else if (session.transcript && session.transcript.status === 'completed') {
        setActiveTab('memory'); // Show memory extraction CTA or memory tab
      } else {
        setActiveTab('technical');
      }

      // Fetch ObjectURL for audio playback
      audioFileManager.getPlaybackUrl(session.id).then(url => {
        setAudioUrl(url);
      });
    } else {
      setAudioUrl(null);
    }
  }, [session, initialSeekMs]);

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
    setTimeout(() => setSeekTargetMs(null), 50);
  };

  const handleSaveSpeakerRename = async () => {
    if (speakerRenameId && onRenameSpeaker) {
      const name = speakerRenameIsUser ? 'You' : (speakerRenameText.trim() || 'Speaker');
      await onRenameSpeaker(session.id, speakerRenameId, name, speakerRenameIsUser);
      setSpeakerRenameId(null);
    }
  };

  const transcript = session.transcript;
  const isTranscribing = transcript?.status === 'waiting' || 
                        transcript?.status === 'uploading' || 
                        transcript?.status === 'transcribing';
  const isTranscribeFailed = transcript?.status === 'failed';
  const isTranscribeCompleted = transcript?.status === 'completed';

  const structuredMemory = session.structuredMemory;
  const hasStructuredMemory = structuredMemory && structuredMemory.status === 'completed';
  const sessionSpeakers = session.speakers || [];

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

            {/* Context Selector Pill */}
            <div style={{ position: 'relative' }}>
              <button
                className="context-badge-btn"
                onClick={() => setEditingContext(!editingContext)}
                title="Change conversation context (Lecture, Meeting, Project discussion, etc.)"
              >
                <Tag size={11} />
                <span>{formatContextLabel(session.contextType, session.customContext)}</span>
                <ChevronDown size={10} />
              </button>

              {editingContext && (
                <div className="context-select-dropdown">
                  {Object.entries(CONTEXT_LABELS).map(([val, label]) => (
                    <button
                      key={val}
                      className={`context-dropdown-item ${session.contextType === val ? 'selected' : ''}`}
                      onClick={async () => {
                        setEditingContext(false);
                        if (onUpdateContext) {
                          await onUpdateContext(session.id, val as ConversationContextType);
                        }
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {hasStructuredMemory && (
              <span className="status-badge-chip success">
                <Brain size={11} />
                <span>Memory Structured</span>
              </span>
            )}
            {isTranscribeCompleted && !hasStructuredMemory && (
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

        {/* Phase 4: Conversation Segments Navigator Strip */}
        {session.conversationSegments && session.conversationSegments.length > 0 && (
          <ConversationSegmentNavigator
            segments={session.conversationSegments}
            activeSegmentId={activeSegmentId}
            onSelectSegment={(id) => setActiveSegmentId(id)}
            onSeekToMs={handleSeekToSegment}
            currentAudioTimeMs={currentAudioTimeMs}
            speakers={session.speakers}
            onRenameSegment={async (segId, newTitle, cType) => {
              if (onRenameSegment) await onRenameSegment(session.id, segId, newTitle, cType);
            }}
            onSplitSegment={async (segId, splitTimeMs, newTitle) => {
              if (onSplitSegment) await onSplitSegment(session.id, segId, splitTimeMs, newTitle);
            }}
            onMergeSegments={async (s1, s2) => {
              if (onMergeSegments) await onMergeSegments(session.id, s1, s2);
            }}
          />
        )}

        {/* Navigation Tabs */}
        <div className="modal-tabs-wrapper">
          <button
            className={`modal-tab-btn ${activeTab === 'memory' ? 'active' : ''}`}
            onClick={() => setActiveTab('memory')}
          >
            <Brain size={14} />
            <span>Structured Memory</span>
            {hasStructuredMemory && <span className="tab-dot-badge" />}
          </button>
          <button
            className={`modal-tab-btn ${activeTab === 'transcript' ? 'active' : ''}`}
            onClick={() => setActiveTab('transcript')}
          >
            <FileText size={14} />
            <span>Conversation</span>
            {isTranscribeCompleted && <span className="tab-dot-badge" />}
          </button>
          <button
            className={`modal-tab-btn ${activeTab === 'speakers' ? 'active' : ''}`}
            onClick={() => setActiveTab('speakers')}
          >
            <Users size={14} />
            <span>Speakers</span>
            {sessionSpeakers.length > 0 && (
              <span className="tab-count-pill">{sessionSpeakers.length}</span>
            )}
          </button>
          <button
            className={`modal-tab-btn ${activeTab === 'technical' ? 'active' : ''}`}
            onClick={() => setActiveTab('technical')}
          >
            <Settings2 size={14} />
            <span>Audio & Info</span>
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

        {/* Transcription Processing Progress Banner */}
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

        {/* Transcription Failed Banner */}
        {isTranscribeFailed && (
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

        {/* TAB 1: STRUCTURED MEMORY (OVERVIEW) */}
        {activeTab === 'memory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* If audio not transcribed yet */}
            {!isTranscribeCompleted && !isTranscribing && (
              <div className="transcribe-cta-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="transcribe-cta-icon">
                    <FileText size={18} color="#ffffff" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                      Transcribe to Structure Memory
                    </h4>
                    <p style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '2px' }}>
                      Convert spoken audio into searchable text, speakers, and action items.
                    </p>
                  </div>
                </div>
                <button
                  className="btn-start-transcribe"
                  onClick={() => setPrivacyModalOpen(true)}
                  id="btn-transcribe-first"
                >
                  <span>Transcribe Audio</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* If transcribed but not extracted yet */}
            {isTranscribeCompleted && !hasStructuredMemory && (
              <div className="transcribe-cta-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="transcribe-cta-icon">
                    <Brain size={18} color="#ffffff" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                      Extract Structured Memory
                    </h4>
                    <p style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '2px' }}>
                      Analyze transcript to identify tasks, decisions, people, topics, and deadlines.
                    </p>
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => onExtractMemory(session)}
                  disabled={isExtractingMemory}
                  id="btn-extract-structured-memory"
                >
                  <Brain size={14} className={isExtractingMemory ? 'spin-icon' : ''} />
                  <span>{isExtractingMemory ? 'Extracting...' : 'Extract Memory'}</span>
                </button>
              </div>
            )}

            {/* If memory extraction is active */}
            {isExtractingMemory && (
              <div className="transcription-progress-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Loader2 size={18} className="spin-icon" color="#818cf8" />
                  <div>
                    <strong style={{ fontSize: '13px', color: '#f8fafc' }}>
                      Extracting Structured Memory...
                    </strong>
                    <p style={{ fontSize: '11px', color: '#a5b4fc', marginTop: '2px' }}>
                      Identifying tasks, key decisions, people, dates, and ideas...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Structured Memory View */}
            {hasStructuredMemory && structuredMemory && (
              <StructuredMemoryView
                memory={structuredMemory}
                onSeekToMs={handleSeekToSegment}
                onToggleTask={(taskId, completed) => onToggleTask(session.id, taskId, completed)}
                onUpdateEntity={(category, itemId, fields) => onUpdateEntity(session.id, category, itemId, fields)}
                onDeleteEntity={(category, itemId) => onDeleteEntity(session.id, category, itemId)}
                onAddEntity={(category, item) => onAddEntity(session.id, category, item)}
                onReExtract={() => onExtractMemory(session)}
                isExtracting={isExtractingMemory}
              />
            )}
          </div>
        )}

        {/* TAB 2: CONVERSATION DIALOGUE & TRANSCRIPT */}
        {activeTab === 'transcript' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {isTranscribeCompleted && transcript ? (
              <TranscriptView
                transcript={transcript}
                speakers={session.speakers}
                conversationSegments={session.conversationSegments}
                activeSegmentId={activeSegmentId}
                currentAudioTimeMs={currentAudioTimeMs}
                onSeekToMs={handleSeekToSegment}
                onSaveEdit={async (newText) => {
                  await onSaveTranscriptEdit(session.id, newText);
                  if (hasStructuredMemory) {
                    onExtractMemory(session);
                  }
                }}
                onRenameSpeaker={onRenameSpeaker ? async (spId, newName, isUser) => {
                  await onRenameSpeaker(session.id, spId, newName, isUser);
                } : undefined}
              />
            ) : isTranscribing ? (
              <div className="transcript-empty-placeholder">
                <Loader2 size={32} className="spin-icon" color="#818cf8" />
                <h3>Generating Transcript & Diarizing...</h3>
                <p>Speech-to-text and speaker identification engines are processing dialogue.</p>
              </div>
            ) : (
              <div className="transcript-empty-placeholder">
                <FileText size={32} color="#71717a" />
                <h3>No Transcript Available</h3>
                <p>
                  Transcribe this session to review spoken words, jump to specific moments in audio, and identify speakers.
                </p>
                <button
                  className="btn-primary"
                  style={{ marginTop: '8px' }}
                  onClick={() => setPrivacyModalOpen(true)}
                  id="btn-tab-transcribe"
                >
                  <FileText size={14} />
                  <span>Start Transcription</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SPEAKERS & DIARIZATION */}
        {activeTab === 'speakers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Speakers ({sessionSpeakers.length})
                </h3>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Distinguish conversation turns, map identities, and assign "You".
                </span>
              </div>
              <button
                className="desktop-bar-btn"
                onClick={() => setSpeakerPrivacyModalOpen(true)}
                title="Manage all stored voice identities"
              >
                <ShieldCheck size={12} />
                <span>Voice Privacy Manager</span>
              </button>
            </div>

            {sessionSpeakers.length === 0 ? (
              <div className="transcript-empty-placeholder" style={{ padding: '36px 16px' }}>
                <Users size={32} color="#6366f1" />
                <h3>No Speakers Diarized Yet</h3>
                <p>
                  Transcribe this session to separate speakers, assign turns, and identify who said what.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sessionSpeakers.map((sp, idx) => {
                  const isEditingThis = speakerRenameId === sp.id;
                  const displayName = getSpeakerDisplayName(sp, `Speaker ${idx + 1}`);

                  return (
                    <div key={sp.id} className="speaker-profile-card">
                      <div 
                        className="person-avatar"
                        style={{ backgroundColor: sp.avatarColor || getSpeakerColor(idx) }}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>

                      {isEditingThis ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input
                            type="text"
                            className="input-field-text"
                            value={speakerRenameText}
                            onChange={(e) => setSpeakerRenameText(e.target.value)}
                            placeholder="Enter speaker name (e.g. Rahul, Sarah)"
                            disabled={speakerRenameIsUser}
                            autoFocus
                          />
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={speakerRenameIsUser}
                              onChange={(e) => setSpeakerRenameIsUser(e.target.checked)}
                            />
                            <span>This is me (The App Owner / "You")</span>
                          </label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button 
                              className="btn-secondary" 
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                              onClick={() => setSpeakerRenameId(null)}
                            >
                              Cancel
                            </button>
                            <button 
                              className="btn-primary" 
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                              onClick={handleSaveSpeakerRename}
                            >
                              Save Identification
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                              {displayName}
                            </span>
                            {sp.isUser && <span className="is-user-tag">YOU</span>}
                            {sp.confidence !== undefined && (
                              <span className="speaker-conf-tag">
                                {Math.round(sp.confidence * 100)}% match
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            Label: {sp.label} • {sp.name ? 'User Verified' : 'Tentative assignment'}
                          </span>
                        </div>
                      )}

                      {!isEditingThis && (
                        <button
                          className="section-add-btn"
                          onClick={() => {
                            setSpeakerRenameId(sp.id);
                            setSpeakerRenameText(sp.name || (sp.isUser ? '' : sp.label));
                            setSpeakerRenameIsUser(sp.isUser);
                          }}
                          title="Rename or identify this speaker"
                        >
                          <Edit3 size={12} />
                          <span>Identify</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TECHNICAL DETAILS & AUDIO FILE INFO */}
        {activeTab === 'technical' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

            {/* Actions Row */}
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

        {/* Speaker Privacy & Voice Identity Manager Dialog */}
        <SpeakerPrivacyModal
          isOpen={speakerPrivacyModalOpen}
          onClose={() => setSpeakerPrivacyModalOpen(false)}
        />
      </div>
    </div>
  );
};
