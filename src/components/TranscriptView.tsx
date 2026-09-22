import React, { useState } from 'react';
import { 
  Edit3, Check, X, Search, Copy, Clock, Sparkles, 
  History, CheckCheck 
} from 'lucide-react';
import { TranscriptData, formatDuration } from '../models/session';

interface TranscriptViewProps {
  transcript: TranscriptData;
  currentAudioTimeMs: number;
  onSeekToMs: (ms: number) => void;
  onSaveEdit: (newText: string) => Promise<void>;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  transcript,
  currentAudioTimeMs,
  onSeekToMs,
  onSaveEdit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(transcript.fullText);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayText = showOriginal 
    ? (transcript.originalText || transcript.fullText) 
    : transcript.fullText;

  // Filter segments by search query if present
  const segments = transcript.segments || [];
  const filteredSegments = segments.filter(s => {
    if (!searchQuery.trim()) return true;
    return s.text.toLowerCase().includes(searchQuery.toLowerCase());
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

  return (
    <div className="transcript-container">
      {/* Transcript Header & Quick Controls */}
      <div className="transcript-header">
        <div className="transcript-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
              Full Transcript
            </span>
            {transcript.isEdited && (
              <span className="edited-badge" title="Content edited by user; original audio file is untouched">
                <Sparkles size={11} />
                <span>Edited • Original Preserved</span>
              </span>
            )}
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            {segments.length} timestamped segments • {transcript.language.toUpperCase()}
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
              title="Edit transcript text"
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
            placeholder="Search within this transcript..."
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
        /* Timestamped Segment Blocks View */
        <div className="transcript-segments-list">
          {filteredSegments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '13px' }}>
              No transcript segments matched "{searchQuery}".
            </div>
          ) : (
            filteredSegments.map((seg) => {
              const isActive = currentAudioTimeMs >= seg.startTimeMs && currentAudioTimeMs < seg.endTimeMs;
              return (
                <div
                  key={seg.id}
                  className={`transcript-segment-card ${isActive ? 'is-active-playback' : ''}`}
                  onClick={() => onSeekToMs(seg.startTimeMs)}
                  role="button"
                  tabIndex={0}
                  title={`Jump audio to ${formatDuration(seg.startTimeMs)}`}
                >
                  <div className="segment-timestamp-pill">
                    <Clock size={11} />
                    <span>{formatDuration(seg.startTimeMs)}</span>
                  </div>
                  <div className="segment-text-content">
                    {seg.text}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
