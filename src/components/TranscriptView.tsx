import React, { useState } from 'react';
import { 
  Edit3, Check, X, Search, Copy, Clock, Sparkles, 
  History, CheckCheck, ChevronDown 
} from 'lucide-react';
import { 
  TranscriptData, 
  SpeakerProfile, 
  ConversationSegment, 
  formatDuration, 
  getSpeakerColor, 
  getSpeakerDisplayName 
} from '../models/session';

interface TranscriptViewProps {
  transcript: TranscriptData;
  speakers?: SpeakerProfile[];
  conversationSegments?: ConversationSegment[];
  activeSegmentId?: string | null;
  currentAudioTimeMs: number;
  onSeekToMs: (ms: number) => void;
  onSaveEdit: (newText: string) => Promise<void>;
  onRenameSpeaker?: (speakerId: string, newName: string, isUser?: boolean) => Promise<void>;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  transcript,
  speakers = [],
  conversationSegments = [],
  activeSegmentId = null,
  currentAudioTimeMs,
  onSeekToMs,
  onSaveEdit,
  onRenameSpeaker,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(transcript.fullText);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Quick Speaker Reassignment Popover state
  const [reassignSpeakerForId, setReassignSpeakerForId] = useState<string | null>(null);
  const [customSpeakerName, setCustomSpeakerName] = useState('');
  const [customIsUser, setCustomIsUser] = useState(false);

  const displayText = showOriginal 
    ? (transcript.originalText || transcript.fullText) 
    : transcript.fullText;

  // Filter segments by active conversation segment and search query
  let segments = transcript.segments || [];
  if (activeSegmentId && conversationSegments.length > 0) {
    const targetSegment = conversationSegments.find(c => c.id === activeSegmentId);
    if (targetSegment) {
      segments = segments.filter(s => 
        (s.conversationSegmentId === activeSegmentId) ||
        (s.startTimeMs >= targetSegment.startTimeMs && s.startTimeMs < targetSegment.endTimeMs)
      );
    }
  }

  const filteredSegments = segments.filter(s => {
    if (!searchQuery.trim()) return true;
    return s.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (s.speakerLabel && s.speakerLabel.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const handleStartEditing = () => {
    setEditText(transcript.fullText);
    setIsEditing(true);
    setShowOriginal(false);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditText(transcript.fullText);
  };

  const handleSave = async () => {
    if (editText.trim() && editText !== transcript.fullText) {
      setIsSaving(true);
      try {
        await onSaveEdit(editText.trim());
      } finally {
        setIsSaving(false);
      }
    }
    setIsEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenSpeakerReassign = (speakerId: string, currentLabel: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReassignSpeakerForId(speakerId);
    setCustomSpeakerName(currentLabel === 'You' ? '' : currentLabel);
    setCustomIsUser(currentLabel === 'You');
  };

  const handleSaveSpeakerReassign = async () => {
    if (reassignSpeakerForId && onRenameSpeaker) {
      const name = customIsUser ? 'You' : (customSpeakerName.trim() || 'Speaker');
      await onRenameSpeaker(reassignSpeakerForId, name, customIsUser);
      setReassignSpeakerForId(null);
    }
  };

  return (
    <div className="transcript-container">
      {/* Transcript Header & Quick Controls */}
      <div className="transcript-header">
        <div className="transcript-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
              Conversation Dialogue
            </span>
            {transcript.isEdited && (
              <span className="edited-badge" title="Content edited by user; original audio file is untouched">
                <Sparkles size={11} />
                <span>Edited • Original Preserved</span>
              </span>
            )}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {filteredSegments.length} utterances {speakers.length > 0 && `• ${speakers.length} speakers`} • {transcript.language.toUpperCase()}
          </span>
        </div>

        <div className="transcript-actions-toolbar">
          {transcript.isEdited && !isEditing && (
            <button
              className="transcript-mini-btn"
              onClick={() => setShowOriginal(!showOriginal)}
              title={showOriginal ? 'Switch to your edited version' : 'View original generated transcript'}
            >
              <History size={13} />
              <span>{showOriginal ? 'View Edited' : 'View Original'}</span>
            </button>
          )}

          {!isEditing && (
            <button
              className="transcript-mini-btn"
              onClick={handleCopy}
              title="Copy transcript text to clipboard"
            >
              {copied ? <CheckCheck size={13} color="#10b981" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}

          {!isEditing && (
            <button
              className="transcript-mini-btn edit"
              onClick={handleStartEditing}
              title="Edit full transcript text"
              id="btn-edit-transcript"
            >
              <Edit3 size={13} />
              <span>Edit Text</span>
            </button>
          )}
        </div>
      </div>

      {/* Search within transcript */}
      {!isEditing && segments.length > 2 && (
        <div className="transcript-search-wrapper">
          <Search size={14} className="transcript-search-icon" />
          <input
            type="text"
            className="transcript-search-input"
            placeholder="Search dialogue by speaker or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="search-clear-btn" 
              onClick={() => setSearchQuery('')}
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Edit Mode Area */}
      {isEditing ? (
        <div className="transcript-edit-box">
          <div className="transcript-edit-notice">
            <span>You are editing the transcript text. Original audio and segment timestamps are preserved.</span>
          </div>
          <textarea
            className="transcript-textarea"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={8}
            placeholder="Edit transcript text..."
            autoFocus
            id="textarea-edit-transcript"
          />
          <div className="transcript-edit-buttons">
            <button 
              className="btn-secondary" 
              onClick={handleCancelEditing}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button 
              className="btn-primary" 
              onClick={handleSave}
              disabled={isSaving || !editText.trim()}
              id="btn-save-transcript"
            >
              <Check size={15} />
              <span>{isSaving ? 'Saving...' : 'Save Transcript'}</span>
            </button>
          </div>
        </div>
      ) : showOriginal ? (
        /* Original Raw Text View */
        <div className="transcript-original-box">
          <div className="original-badge-tag">
            <span>Original Unedited Whisper Transcript</span>
          </div>
          <p className="transcript-text-flow">
            {transcript.originalText || transcript.fullText}
          </p>
        </div>
      ) : (
        /* Speaker-Aware Dialogue Stream */
        <div className="transcript-dialogue-list">
          {filteredSegments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '13px' }}>
              No utterances matched "{searchQuery}".
            </div>
          ) : (
            filteredSegments.map((seg, idx) => {
              const isActive = currentAudioTimeMs >= seg.startTimeMs && currentAudioTimeMs < seg.endTimeMs;
              const speaker = speakers.find(s => s.id === seg.speakerId);
              const displayName = getSpeakerDisplayName(speaker, seg.speakerLabel || 'Speaker');
              const isUser = speaker?.isUser || displayName === 'You';
              const speakerColor = speaker?.avatarColor || getSpeakerColor(idx);

              // Check if this segment represents the start of a conversation segment
              const matchingConversation = conversationSegments.find(c => 
                Math.abs(c.startTimeMs - seg.startTimeMs) < 1500
              );

              return (
                <React.Fragment key={seg.id}>
                  {matchingConversation && !activeSegmentId && (
                    <div className="dialogue-segment-divider">
                      <div className="divider-line" />
                      <span className="divider-tag">
                        {matchingConversation.title} ({formatDuration(matchingConversation.startTimeMs)})
                      </span>
                      <div className="divider-line" />
                    </div>
                  )}

                  <div
                    className={`dialogue-turn-card ${isUser ? 'is-user-turn' : 'is-other-turn'} ${isActive ? 'is-active-playback' : ''}`}
                    onClick={() => onSeekToMs(seg.startTimeMs)}
                    role="button"
                    tabIndex={0}
                    title={`Jump audio to ${formatDuration(seg.startTimeMs)}`}
                  >
                    {/* Speaker Header */}
                    <div className="dialogue-speaker-header">
                      <div 
                        className="dialogue-avatar"
                        style={{ backgroundColor: speakerColor }}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>

                      <div className="dialogue-speaker-meta">
                        <button
                          className="dialogue-speaker-name-btn"
                          onClick={(e) => handleOpenSpeakerReassign(seg.speakerId || `sp_${idx}`, displayName, e)}
                          title="Click to rename or reassign speaker"
                        >
                          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{displayName}</span>
                          {isUser && <span className="dialogue-you-pill">YOU</span>}
                          {seg.confidence && seg.confidence < 0.85 && (
                            <span className="dialogue-uncertain-pill" title="Estimated turn">Uncertain</span>
                          )}
                          <ChevronDown size={11} className="speaker-dropdown-icon" />
                        </button>
                      </div>

                      <div className="segment-timestamp-pill" style={{ marginLeft: 'auto' }}>
                        <Clock size={10} />
                        <span>{formatDuration(seg.startTimeMs)}</span>
                      </div>
                    </div>

                    {/* Utterance Text */}
                    <div className="dialogue-text-bubble">
                      {seg.text}
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>
      )}

      {/* Speaker Reassign / Rename Popover Modal */}
      {reassignSpeakerForId && (
        <div className="modal-overlay" role="dialog" aria-modal="true" style={{ zIndex: 140 }}>
          <div className="modal-sheet" style={{ maxWidth: '380px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
              Identify Speaker
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Assign a name to this speaker across all turns in this session.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              <div>
                <label className="input-field-label">Speaker Name</label>
                <input
                  type="text"
                  className="input-field-text"
                  value={customSpeakerName}
                  onChange={e => setCustomSpeakerName(e.target.value)}
                  placeholder="e.g. Rahul, Professor, Sarah"
                  disabled={customIsUser}
                  autoFocus
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={customIsUser}
                  onChange={e => setCustomIsUser(e.target.checked)}
                />
                <span>This speaker is Me ("You")</span>
              </label>

              {speakers.length > 0 && (
                <div style={{ marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Or select known speaker:</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {speakers.map(sp => (
                      <button
                        key={sp.id}
                        type="button"
                        className="section-add-btn"
                        onClick={() => {
                          setCustomSpeakerName(sp.name || sp.label);
                          setCustomIsUser(sp.isUser);
                        }}
                      >
                        {sp.isUser ? 'You' : (sp.name || sp.label)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-sheet-actions" style={{ marginTop: '14px' }}>
              <button className="btn-secondary" onClick={() => setReassignSpeakerForId(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveSpeakerReassign}>
                <Check size={14} />
                <span>Save Speaker</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
