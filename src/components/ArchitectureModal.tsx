import React from 'react';
import { X, ShieldCheck, Mic, Cpu, Search, Sparkles } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-sheet" style={{ maxWidth: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="phase-tag">SYSTEM ARCHITECTURE</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Phase 1 Foundation</span>
          </div>
          <button className="card-options-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
            Modular Memory Architecture
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
            Built with strict layer decoupling so AI features plug in seamlessly while keeping local control.
          </p>
        </div>

        {/* Pipeline Evolution Diagram */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
            EVOLUTION PIPELINE
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Step 1: Active Phase 1 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <Mic size={16} color="var(--text-main)" />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>1. User Memory Session</span>
                  <span style={{ fontSize: '10px', background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: '4px', color: 'var(--text-secondary)', fontWeight: 600 }}>ACTIVE</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Explicit start/stop recording, precision timing, local IndexedDB blob storage.
                </p>
              </div>
            </div>

            {/* Step 2: Speech to Text */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <Cpu size={16} color="var(--text-main)" />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>2. Speech-to-Text & Speakers</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Phase 2-4</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Whisper transcription & speaker diarization mapped to <code style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>TranscriptData</code>.
                </p>
              </div>
            </div>

            {/* Step 3: Structured Memory & AI */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <Sparkles size={16} color="var(--text-main)" />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>3. Structured AI Memory</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Phase 3</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Action items, key decisions, topics, and contextual summaries.
                </p>
              </div>
            </div>

            {/* Step 4: Semantic Search & Assistant */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <Search size={16} color="var(--text-main)" />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>4. Semantic Search & Assistant</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Phase 5</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Vector embeddings for natural language queries across past life memories.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Highlight */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          <ShieldCheck size={18} color="var(--text-main)" />
          <span>
            Zero cloud telemetry or unwanted tracking. 100% on-device IndexedDB storage.
          </span>
        </div>

        <button className="btn-secondary" onClick={onClose} style={{ marginTop: '6px' }}>
          Close
        </button>
      </div>
    </div>
  );
};
