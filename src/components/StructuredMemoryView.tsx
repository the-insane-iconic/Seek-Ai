import React, { useState } from 'react';
import { 
  CheckSquare, Square, Clock, Users, Tag, CheckCircle2, 
  HelpCircle, Lightbulb, Calendar, Bookmark, RotateCcw, 
  Edit3, Trash2, Plus, CalendarDays, User
} from 'lucide-react';
import { 
  StructuredMemory, 
  formatDuration
} from '../models/session';

interface StructuredMemoryViewProps {
  memory: StructuredMemory;
  onSeekToMs: (ms: number) => void;
  onToggleTask: (taskId: string, completed: boolean) => Promise<void>;
  onUpdateEntity: (category: keyof StructuredMemory, itemId: string, fields: any) => Promise<void>;
  onDeleteEntity: (category: keyof StructuredMemory, itemId: string) => Promise<void>;
  onAddEntity: (category: keyof StructuredMemory, item: any) => Promise<void>;
  onReExtract: () => void;
  isExtracting?: boolean;
}

export const StructuredMemoryView: React.FC<StructuredMemoryViewProps> = ({
  memory,
  onSeekToMs,
  onToggleTask,
  onUpdateEntity,
  onDeleteEntity,
  onAddEntity,
  onReExtract,
  isExtracting = false
}) => {
  // Modal state for editing or adding an entity
  const [editingModal, setEditingModal] = useState<{
    isOpen: boolean;
    isNew: boolean;
    category: keyof StructuredMemory;
    itemId?: string;
    title: string;
    text: string;
    secondaryText?: string;
    dateText?: string;
  } | null>(null);

  const handleOpenEdit = (category: keyof StructuredMemory, item: any, isNew: boolean = false) => {
    let text = '';
    let secondaryText = '';
    let dateText = '';

    if (category === 'tasks') {
      text = item.task || '';
      secondaryText = item.assignee || '';
      dateText = item.dueDate || '';
    } else if (category === 'decisions') {
      text = item.decision || '';
      secondaryText = item.context || '';
    } else if (category === 'people') {
      text = item.name || '';
      secondaryText = item.role || '';
    } else if (category === 'topics') {
      text = item.name || '';
    } else if (category === 'questions') {
      text = item.question || '';
      secondaryText = item.answer || '';
    } else if (category === 'ideas') {
      text = item.idea || '';
    } else if (category === 'facts') {
      text = item.fact || '';
      secondaryText = item.category || '';
    } else if (category === 'events') {
      text = item.title || '';
      dateText = item.dateOrTime || '';
      secondaryText = item.location || '';
    } else if (category === 'commitments') {
      text = item.commitment || '';
      secondaryText = item.fromPerson || '';
    } else if (category === 'keyPoints') {
      text = item.point || '';
    }

    setEditingModal({
      isOpen: true,
      isNew,
      category,
      itemId: item.id,
      title: isNew ? `Add ${String(category).slice(0, -1)}` : `Edit ${String(category).slice(0, -1)}`,
      text,
      secondaryText,
      dateText
    });
  };

  const handleSaveModal = async () => {
    if (!editingModal) return;
    const { category, isNew, itemId, text, secondaryText, dateText } = editingModal;

    if (!text.trim()) {
      setEditingModal(null);
      return;
    }

    let payload: any = {};
    if (category === 'tasks') {
      payload = { task: text.trim(), assignee: secondaryText?.trim() || undefined, dueDate: dateText?.trim() || undefined, completed: false };
    } else if (category === 'decisions') {
      payload = { decision: text.trim(), context: secondaryText?.trim() || undefined };
    } else if (category === 'people') {
      payload = { name: text.trim(), role: secondaryText?.trim() || undefined, mentionCount: 1 };
    } else if (category === 'topics') {
      payload = { name: text.trim() };
    } else if (category === 'questions') {
      payload = { question: text.trim(), answer: secondaryText?.trim() || undefined, status: secondaryText?.trim() ? 'answered' : 'open' };
    } else if (category === 'ideas') {
      payload = { idea: text.trim() };
    } else if (category === 'facts') {
      payload = { fact: text.trim(), category: secondaryText?.trim() || undefined };
    } else if (category === 'events') {
      payload = { title: text.trim(), dateOrTime: dateText?.trim() || undefined, location: secondaryText?.trim() || undefined };
    } else if (category === 'commitments') {
      payload = { commitment: text.trim(), fromPerson: secondaryText?.trim() || undefined };
    } else if (category === 'keyPoints') {
      payload = { point: text.trim() };
    }

    if (isNew) {
      await onAddEntity(category, payload);
    } else if (itemId) {
      await onUpdateEntity(category, itemId, payload);
    }

    setEditingModal(null);
  };

  const summary = memory.summary;
  const tasks = memory.tasks || [];
  const decisions = memory.decisions || [];
  const people = memory.people || [];
  const topics = memory.topics || [];
  const questions = memory.questions || [];
  const ideas = memory.ideas || [];
  const keyPoints = memory.keyPoints || [];
  const dates = memory.dates || [];
  const events = memory.events || [];
  const facts = memory.facts || [];
  const commitments = memory.commitments || [];

  return (
    <div className="structured-memory-view">
      {/* Top Banner: Executive Summary & Re-Analyze Action */}
      <div className="memory-summary-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="phase-tag">AI STRUCTURED MEMORY</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Engine: {memory.modelUsed}
            </span>
          </div>
          <button
            className="transcript-mini-btn"
            onClick={onReExtract}
            disabled={isExtracting}
            title="Re-run AI extraction"
            id="btn-reextract-memory"
          >
            <RotateCcw size={12} className={isExtracting ? 'spin-icon' : ''} />
            <span>{isExtracting ? 'Analyzing...' : 'Re-Analyze'}</span>
          </button>
        </div>

        {summary && (
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', lineHeight: 1.5 }}>
              {summary.oneLiner}
            </p>
            {summary.keyTakeaways && summary.keyTakeaways.length > 0 && (
              <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#cbd5e1' }}>
                {summary.keyTakeaways.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Topics Strip */}
      {topics.length > 0 && (
        <div className="memory-section-box">
          <div className="memory-section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={14} color="#818cf8" />
              <span className="memory-section-title">Topics</span>
            </div>
            <button
              className="section-add-btn"
              onClick={() => handleOpenEdit('topics', {}, true)}
              title="Add Topic"
            >
              <Plus size={12} />
              <span>Add</span>
            </button>
          </div>
          <div className="topics-pill-grid">
            {topics.map((t) => (
              <div key={t.id} className="topic-pill-chip">
                <span>#{t.name}</span>
                {t.isUserEdited && <span className="edited-dot" title="User modified" />}
                <button 
                  className="pill-del-btn" 
                  onClick={() => onDeleteEntity('topics', t.id)}
                  title="Remove topic"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items / Tasks Section */}
      <div className="memory-section-box">
        <div className="memory-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckSquare size={15} color="#34d399" />
            <span className="memory-section-title">Tasks & Action Items</span>
            <span className="section-badge-counter">({tasks.length})</span>
          </div>
          <button
            className="section-add-btn"
            onClick={() => handleOpenEdit('tasks', {}, true)}
            title="Add new task"
          >
            <Plus size={12} />
            <span>Add Task</span>
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="memory-empty-category">No action items or tasks detected.</div>
        ) : (
          <div className="memory-items-list">
            {tasks.map((task) => (
              <div key={task.id} className={`memory-task-item ${task.completed ? 'is-completed' : ''}`}>
                <button
                  className="task-checkbox-btn"
                  onClick={() => onToggleTask(task.id, !task.completed)}
                  title={task.completed ? 'Mark as incomplete' : 'Mark as completed'}
                  aria-label="Toggle task completion"
                >
                  {task.completed ? (
                    <CheckSquare size={18} color="#10b981" />
                  ) : (
                    <Square size={18} color="#64748b" />
                  )}
                </button>

                <div className="task-content-col">
                  <span className={`task-text ${task.completed ? 'line-through' : ''}`}>
                    {task.task}
                  </span>
                  <div className="task-meta-row">
                    {task.assignee && (
                      <span className="task-meta-tag assignee">
                        <User size={10} />
                        <span>{task.assignee}</span>
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="task-meta-tag deadline">
                        <Calendar size={10} />
                        <span>Due: {task.dueDate}</span>
                      </span>
                    )}
                    {task.sourceTimestampMs !== undefined && (
                      <button
                        className="timestamp-jump-btn"
                        onClick={() => onSeekToMs(task.sourceTimestampMs!)}
                        title={`Listen from ${formatDuration(task.sourceTimestampMs)}`}
                      >
                        <Clock size={10} />
                        <span>{formatDuration(task.sourceTimestampMs)}</span>
                      </button>
                    )}
                    {task.isUserEdited && (
                      <span className="edited-indicator-tag">Edited</span>
                    )}
                  </div>
                </div>

                <div className="item-action-buttons">
                  <button 
                    className="card-options-btn"
                    onClick={() => handleOpenEdit('tasks', task, false)}
                    title="Edit task"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button 
                    className="card-options-btn delete"
                    onClick={() => onDeleteEntity('tasks', task.id)}
                    title="Delete task"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decisions Section */}
      <div className="memory-section-box">
        <div className="memory-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={15} color="#818cf8" />
            <span className="memory-section-title">Key Decisions</span>
            <span className="section-badge-counter">({decisions.length})</span>
          </div>
          <button
            className="section-add-btn"
            onClick={() => handleOpenEdit('decisions', {}, true)}
            title="Add decision"
          >
            <Plus size={12} />
            <span>Add</span>
          </button>
        </div>

        {decisions.length === 0 ? (
          <div className="memory-empty-category">No explicit decisions recorded.</div>
        ) : (
          <div className="memory-items-list">
            {decisions.map((dec) => (
              <div key={dec.id} className="memory-card-item">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                      {dec.decision}
                    </span>
                    {dec.isUserEdited && <span className="edited-indicator-tag">Edited</span>}
                  </div>
                  {dec.context && (
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{dec.context}</span>
                  )}
                  {dec.sourceTimestampMs !== undefined && (
                    <button
                      className="timestamp-jump-btn"
                      onClick={() => onSeekToMs(dec.sourceTimestampMs!)}
                      style={{ alignSelf: 'flex-start', marginTop: '2px' }}
                    >
                      <Clock size={10} />
                      <span>{formatDuration(dec.sourceTimestampMs)}</span>
                    </button>
                  )}
                </div>

                <div className="item-action-buttons">
                  <button 
                    className="card-options-btn"
                    onClick={() => handleOpenEdit('decisions', dec, false)}
                    title="Edit decision"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button 
                    className="card-options-btn delete"
                    onClick={() => onDeleteEntity('decisions', dec.id)}
                    title="Delete decision"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Commitments Section */}
      {commitments.length > 0 && (
        <div className="memory-section-box">
          <div className="memory-section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bookmark size={14} color="#a855f7" />
              <span className="memory-section-title">Commitments</span>
              <span className="section-badge-counter">({commitments.length})</span>
            </div>
            <button
              className="section-add-btn"
              onClick={() => handleOpenEdit('commitments', {}, true)}
              title="Add commitment"
            >
              <Plus size={12} />
              <span>Add</span>
            </button>
          </div>
          <div className="memory-items-list">
            {commitments.map((comm) => (
              <div key={comm.id} className="memory-card-item">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#f8fafc' }}>
                    "{comm.commitment}"
                  </span>
                  {comm.fromPerson && (
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>By: {comm.fromPerson}</span>
                  )}
                  {comm.sourceTimestampMs !== undefined && (
                    <button
                      className="timestamp-jump-btn"
                      onClick={() => onSeekToMs(comm.sourceTimestampMs!)}
                      style={{ alignSelf: 'flex-start', marginTop: '2px' }}
                    >
                      <Clock size={10} />
                      <span>{formatDuration(comm.sourceTimestampMs)}</span>
                    </button>
                  )}
                </div>
                <div className="item-action-buttons">
                  <button 
                    className="card-options-btn delete"
                    onClick={() => onDeleteEntity('commitments', comm.id)}
                    title="Delete commitment"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* People Mentioned */}
      {people.length > 0 && (
        <div className="memory-section-box">
          <div className="memory-section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={14} color="#38bdf8" />
              <span className="memory-section-title">People Mentioned</span>
              <span className="section-badge-counter">({people.length})</span>
            </div>
            <button
              className="section-add-btn"
              onClick={() => handleOpenEdit('people', {}, true)}
              title="Add person"
            >
              <Plus size={12} />
              <span>Add</span>
            </button>
          </div>
          <div className="people-badge-grid">
            {people.map((p) => (
              <div key={p.id} className="person-badge-card">
                <div className="person-avatar">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                    {p.name}
                  </span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                    {p.role || `${p.mentionCount} mentions`}
                  </span>
                </div>
                {p.sourceTimestampMs !== undefined && (
                  <button
                    className="timestamp-jump-btn"
                    onClick={() => onSeekToMs(p.sourceTimestampMs!)}
                    style={{ marginLeft: 'auto' }}
                  >
                    <Clock size={10} />
                    <span>{formatDuration(p.sourceTimestampMs)}</span>
                  </button>
                )}
                <button
                  className="pill-del-btn"
                  onClick={() => onDeleteEntity('people', p.id)}
                  title="Remove person"
                  style={{ marginLeft: '4px' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions & Ideas Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {/* Questions */}
        {questions.length > 0 && (
          <div className="memory-section-box">
            <div className="memory-section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HelpCircle size={14} color="#f59e0b" />
                <span className="memory-section-title">Questions Raised</span>
              </div>
            </div>
            <div className="memory-items-list">
              {questions.map((q) => (
                <div key={q.id} className="memory-mini-card">
                  <span style={{ fontSize: '12px', color: '#f8fafc', fontWeight: 500 }}>
                    "{q.question}"
                  </span>
                  {q.sourceTimestampMs !== undefined && (
                    <button
                      className="timestamp-jump-btn"
                      onClick={() => onSeekToMs(q.sourceTimestampMs!)}
                      style={{ marginTop: '2px', alignSelf: 'flex-start' }}
                    >
                      <Clock size={10} />
                      <span>{formatDuration(q.sourceTimestampMs)}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ideas */}
        {ideas.length > 0 && (
          <div className="memory-section-box">
            <div className="memory-section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lightbulb size={14} color="#eab308" />
                <span className="memory-section-title">Ideas & Insights</span>
              </div>
            </div>
            <div className="memory-items-list">
              {ideas.map((idea) => (
                <div key={idea.id} className="memory-mini-card">
                  <span style={{ fontSize: '12px', color: '#f8fafc', fontWeight: 500 }}>
                    {idea.idea}
                  </span>
                  {idea.sourceTimestampMs !== undefined && (
                    <button
                      className="timestamp-jump-btn"
                      onClick={() => onSeekToMs(idea.sourceTimestampMs!)}
                      style={{ marginTop: '2px', alignSelf: 'flex-start' }}
                    >
                      <Clock size={10} />
                      <span>{formatDuration(idea.sourceTimestampMs)}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Events & Deadlines */}
      {(events.length > 0 || dates.length > 0) && (
        <div className="memory-section-box">
          <div className="memory-section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CalendarDays size={14} color="#ec4899" />
              <span className="memory-section-title">Events & Deadlines</span>
            </div>
          </div>
          <div className="memory-items-list">
            {events.map((ev) => (
              <div key={ev.id} className="memory-mini-card" style={{ borderLeft: '3px solid #ec4899' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>{ev.title}</span>
                  {ev.dateOrTime && <span style={{ fontSize: '11px', color: '#f472b6', fontFamily: 'var(--font-mono)' }}>{ev.dateOrTime}</span>}
                </div>
                {ev.sourceTimestampMs !== undefined && (
                  <button className="timestamp-jump-btn" onClick={() => onSeekToMs(ev.sourceTimestampMs!)}>
                    <Clock size={10} />
                    <span>{formatDuration(ev.sourceTimestampMs)}</span>
                  </button>
                )}
              </div>
            ))}
            {dates.map((d) => (
              <div key={d.id} className="memory-mini-card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#f8fafc' }}>{d.description}</span>
                  <span style={{ fontSize: '11px', color: '#a5b4fc', fontWeight: 600 }}>{d.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Points */}
      {keyPoints.length > 0 && (
        <div className="memory-section-box">
          <div className="memory-section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bookmark size={14} color="#38bdf8" />
              <span className="memory-section-title">Key Points</span>
              <span className="section-badge-counter">({keyPoints.length})</span>
            </div>
          </div>
          <div className="memory-items-list">
            {keyPoints.map((kp) => (
              <div key={kp.id} className="memory-mini-card">
                <span style={{ fontSize: '12px', color: '#cbd5e1' }}>• {kp.point}</span>
                {kp.sourceTimestampMs !== undefined && (
                  <button className="timestamp-jump-btn" onClick={() => onSeekToMs(kp.sourceTimestampMs!)}>
                    <Clock size={10} />
                    <span>{formatDuration(kp.sourceTimestampMs)}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Important Facts */}
      {facts.length > 0 && (
        <div className="memory-section-box">
          <div className="memory-section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bookmark size={14} color="#06b6d4" />
              <span className="memory-section-title">Important Facts</span>
            </div>
          </div>
          <div className="memory-items-list">
            {facts.map((fact) => (
              <div key={fact.id} className="memory-mini-card">
                <span style={{ fontSize: '12px', color: '#cbd5e1' }}>• {fact.fact}</span>
                {fact.sourceTimestampMs !== undefined && (
                  <button className="timestamp-jump-btn" onClick={() => onSeekToMs(fact.sourceTimestampMs!)}>
                    <Clock size={10} />
                    <span>{formatDuration(fact.sourceTimestampMs)}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal for Editing or Adding an Entity */}
      {editingModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" style={{ zIndex: 120 }}>
          <div className="modal-sheet" style={{ maxWidth: '440px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              {editingModal.title}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
                Description / Title
              </label>
              <input
                type="text"
                className="title-input"
                value={editingModal.text}
                onChange={(e) => setEditingModal({ ...editingModal, text: e.target.value })}
                autoFocus
                placeholder="Enter text..."
              />

              {(editingModal.category === 'tasks' || editingModal.category === 'people' || editingModal.category === 'decisions') && (
                <>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
                    {editingModal.category === 'tasks' ? 'Assignee' : editingModal.category === 'people' ? 'Role' : 'Context'}
                  </label>
                  <input
                    type="text"
                    className="title-input"
                    value={editingModal.secondaryText || ''}
                    onChange={(e) => setEditingModal({ ...editingModal, secondaryText: e.target.value })}
                    placeholder="Optional..."
                  />
                </>
              )}

              {editingModal.category === 'tasks' && (
                <>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
                    Deadline / Due Date
                  </label>
                  <input
                    type="text"
                    className="title-input"
                    value={editingModal.dateText || ''}
                    onChange={(e) => setEditingModal({ ...editingModal, dateText: e.target.value })}
                    placeholder="e.g. Friday, Tomorrow, Oct 1st"
                  />
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button 
                className="btn-secondary" 
                style={{ flex: 1 }} 
                onClick={() => setEditingModal(null)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 1 }} 
                onClick={handleSaveModal}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
