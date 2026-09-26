import React, { useState } from 'react';
import { 
  Scissors, GitMerge, Edit2, Check, Layers 
} from 'lucide-react';
import { 
  ConversationSegment, 
  ConversationContextType, 
  formatDuration, 
  formatContextLabel, 
  CONTEXT_LABELS,
  SpeakerProfile 
} from '../models/session';

interface ConversationSegmentNavigatorProps {
  segments: ConversationSegment[];
  activeSegmentId: string | null;
  onSelectSegment: (segmentId: string | null) => void;
  onSeekToMs: (ms: number) => void;
  currentAudioTimeMs: number;
  speakers?: SpeakerProfile[];
  onRenameSegment: (segmentId: string, newTitle: string, contextType: ConversationContextType) => Promise<void>;
  onSplitSegment: (segmentId: string, splitTimeMs: number, newTitle?: string) => Promise<void>;
  onMergeSegments: (segmentId1: string, segmentId2: string) => Promise<void>;
}

export const ConversationSegmentNavigator: React.FC<ConversationSegmentNavigatorProps> = ({
  segments,
  activeSegmentId,
  onSelectSegment,
  onSeekToMs,
  currentAudioTimeMs,
  speakers = [],
  onRenameSegment,
  onSplitSegment,
  onMergeSegments,
}) => {
  const [editingSegment, setEditingSegment] = useState<ConversationSegment | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContext, setEditContext] = useState<ConversationContextType>('project');

  const [splittingSegment, setSplittingSegment] = useState<ConversationSegment | null>(null);
  const [splitTimeSec, setSplitTimeSec] = useState<number>(0);
  const [splitTitle, setSplitTitle] = useState('');

  const [isMerging, setIsMerging] = useState(false);
  const [mergeTargetId1, setMergeTargetId1] = useState<string>('');
  const [mergeTargetId2, setMergeTargetId2] = useState<string>('');

  if (!segments || segments.length === 0) return null;

  const handleOpenEdit = (seg: ConversationSegment, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSegment(seg);
    setEditTitle(seg.title);
    setEditContext(seg.contextType);
  };

  const handleSaveEdit = async () => {
    if (editingSegment && editTitle.trim()) {
      await onRenameSegment(editingSegment.id, editTitle.trim(), editContext);
      setEditingSegment(null);
    }
  };

  const handleOpenSplit = (seg: ConversationSegment, e: React.MouseEvent) => {
    e.stopPropagation();
    setSplittingSegment(seg);
    // Default split time to current audio time if within bounds, else midpoint
    const currentSec = Math.floor(currentAudioTimeMs / 1000);
    const startSec = Math.floor(seg.startTimeMs / 1000);
    const endSec = Math.floor(seg.endTimeMs / 1000);
    if (currentSec > startSec && currentSec < endSec) {
      setSplitTimeSec(currentSec);
    } else {
      setSplitTimeSec(Math.floor((startSec + endSec) / 2));
    }
    setSplitTitle(`${seg.title} (Part 2)`);
  };

  const handleConfirmSplit = async () => {
    if (splittingSegment) {
      const splitTimeMs = splitTimeSec * 1000;
      await onSplitSegment(splittingSegment.id, splitTimeMs, splitTitle.trim() || undefined);
      setSplittingSegment(null);
    }
  };

  const handleConfirmMerge = async () => {
    if (mergeTargetId1 && mergeTargetId2 && mergeTargetId1 !== mergeTargetId2) {
      await onMergeSegments(mergeTargetId1, mergeTargetId2);
      setIsMerging(false);
      setMergeTargetId1('');
      setMergeTargetId2('');
    }
  };

  return (
    <div className="segment-navigator-container">
      <div className="segment-navigator-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} color="var(--text-main)" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.04em' }}>
            CONVERSATION SEGMENTS ({segments.length})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {segments.length >= 2 && (
            <button
              className="segment-tool-btn"
              onClick={() => {
                setMergeTargetId1(segments[0].id);
                setMergeTargetId2(segments[1].id);
                setIsMerging(true);
              }}
              title="Merge two adjacent segments"
            >
              <GitMerge size={12} />
              <span>Merge</span>
            </button>
          )}
          {activeSegmentId !== null && (
            <button
              className="segment-tool-btn"
              onClick={() => onSelectSegment(null)}
              title="Show all segments combined"
            >
              <span>View All</span>
            </button>
          )}
        </div>
      </div>

      {/* Horizontal pill list of conversation segments */}
      <div className="segment-pills-scroll">
        <button
          className={`segment-tab-chip ${activeSegmentId === null ? 'is-active' : ''}`}
          onClick={() => onSelectSegment(null)}
        >
          <span className="segment-chip-title">All Conversations</span>
          <span className="segment-chip-time">{formatDuration(segments[segments.length - 1].endTimeMs)}</span>
        </button>

        {segments.map((seg) => {
          const isSelected = activeSegmentId === seg.id;
          const isCurrentlyPlaying = currentAudioTimeMs >= seg.startTimeMs && currentAudioTimeMs <= seg.endTimeMs;

          // Find active speakers in this segment
          const segmentSpeakers = speakers.filter(sp => seg.speakerIds?.includes(sp.id));

          return (
            <div
              key={seg.id}
              className={`segment-tab-chip ${isSelected ? 'is-active' : ''} ${isCurrentlyPlaying ? 'is-playing' : ''}`}
              onClick={() => {
                onSelectSegment(seg.id);
                onSeekToMs(seg.startTimeMs);
              }}
              role="button"
              tabIndex={0}
            >
              <div className="segment-chip-top">
                <span className="segment-context-tag">
                  {formatContextLabel(seg.contextType, seg.customContext)}
                </span>
                <span className="segment-chip-time">
                  {formatDuration(seg.startTimeMs)}–{formatDuration(seg.endTimeMs)}
                </span>
              </div>

              <div className="segment-chip-title-row">
                <span className="segment-chip-title" title={seg.title}>
                  {seg.title}
                </span>
                {seg.isUserEdited && <span className="edited-dot" title="User customized" />}
              </div>

              {segmentSpeakers.length > 0 && (
                <div className="segment-speakers-row">
                  {segmentSpeakers.slice(0, 3).map(sp => (
                    <span 
                      key={sp.id} 
                      className="segment-speaker-mini-pill"
                      style={{ borderLeftColor: sp.avatarColor || '#38bdf8' }}
                    >
                      {sp.isUser ? 'You' : (sp.name || sp.label)}
                    </span>
                  ))}
                  {segmentSpeakers.length > 3 && (
                    <span className="segment-speaker-more">+{segmentSpeakers.length - 3}</span>
                  )}
                </div>
              )}

              <div className="segment-chip-actions" onClick={e => e.stopPropagation()}>
                <button
                  className="segment-action-icon-btn"
                  onClick={e => handleOpenEdit(seg, e)}
                  title="Rename segment / change context"
                >
                  <Edit2 size={11} />
                </button>
                <button
                  className="segment-action-icon-btn"
                  onClick={e => handleOpenSplit(seg, e)}
                  title="Split conversation into two"
                >
                  <Scissors size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Segment Modal */}
      {editingSegment && (
        <div className="modal-overlay" role="dialog" aria-modal="true" style={{ zIndex: 130 }}>
          <div className="modal-sheet" style={{ maxWidth: '420px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
              Edit Conversation Segment
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              <div>
                <label className="input-field-label">Conversation Title</label>
                <input
                  type="text"
                  className="input-field-text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="e.g. Physics Lecture, Project Discussion"
                  autoFocus
                />
              </div>

              <div>
                <label className="input-field-label">Conversation Context</label>
                <select
                  className="input-field-select"
                  value={editContext}
                  onChange={e => setEditContext(e.target.value as ConversationContextType)}
                >
                  {Object.entries(CONTEXT_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Span: {formatDuration(editingSegment.startTimeMs)} – {formatDuration(editingSegment.endTimeMs)}
              </div>
            </div>

            <div className="modal-sheet-actions" style={{ marginTop: '16px' }}>
              <button className="btn-secondary" onClick={() => setEditingSegment(null)}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleSaveEdit}
                disabled={!editTitle.trim()}
              >
                <Check size={14} />
                <span>Save Segment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Segment Modal */}
      {splittingSegment && (
        <div className="modal-overlay" role="dialog" aria-modal="true" style={{ zIndex: 130 }}>
          <div className="modal-sheet" style={{ maxWidth: '420px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
              Split Conversation Segment
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Divide "{splittingSegment.title}" into two distinct conversations.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              <div>
                <label className="input-field-label">Split Timestamp</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min={Math.floor(splittingSegment.startTimeMs / 1000) + 1}
                    max={Math.floor(splittingSegment.endTimeMs / 1000) - 1}
                    value={splitTimeSec}
                    onChange={e => setSplitTimeSec(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'var(--font-mono)', minWidth: '48px' }}>
                    {formatDuration(splitTimeSec * 1000)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                  <span>Start: {formatDuration(splittingSegment.startTimeMs)}</span>
                  <span>End: {formatDuration(splittingSegment.endTimeMs)}</span>
                </div>
              </div>

              <div>
                <label className="input-field-label">Title for Second Conversation</label>
                <input
                  type="text"
                  className="input-field-text"
                  value={splitTitle}
                  onChange={e => setSplitTitle(e.target.value)}
                  placeholder="e.g. Conversation with Rahul"
                />
              </div>
            </div>

            <div className="modal-sheet-actions" style={{ marginTop: '16px' }}>
              <button className="btn-secondary" onClick={() => setSplittingSegment(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleConfirmSplit}>
                <Scissors size={14} />
                <span>Split Segment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Segments Modal */}
      {isMerging && (
        <div className="modal-overlay" role="dialog" aria-modal="true" style={{ zIndex: 130 }}>
          <div className="modal-sheet" style={{ maxWidth: '420px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
              Merge Conversation Segments
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Combine two adjacent conversation segments into a single conversation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              <div>
                <label className="input-field-label">First Segment</label>
                <select
                  className="input-field-select"
                  value={mergeTargetId1}
                  onChange={e => setMergeTargetId1(e.target.value)}
                >
                  {segments.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({formatDuration(s.startTimeMs)} - {formatDuration(s.endTimeMs)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-field-label">Second Segment to Merge With</label>
                <select
                  className="input-field-select"
                  value={mergeTargetId2}
                  onChange={e => setMergeTargetId2(e.target.value)}
                >
                  {segments.filter(s => s.id !== mergeTargetId1).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({formatDuration(s.startTimeMs)} - {formatDuration(s.endTimeMs)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-sheet-actions" style={{ marginTop: '16px' }}>
              <button className="btn-secondary" onClick={() => setIsMerging(false)}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleConfirmMerge}
                disabled={!mergeTargetId1 || !mergeTargetId2 || mergeTargetId1 === mergeTargetId2}
              >
                <GitMerge size={14} />
                <span>Merge Segments</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
