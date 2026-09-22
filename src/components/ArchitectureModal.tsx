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
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
            Modular Memory Architecture
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', lineHeight: 1.4 }}>
            Built with strict layer decoupling so Phase 2 AI features can be plugged in seamlessly without rewriting the mobile foundation.
          </p>
        </div>

        {/* Pipeline Evolution Diagram */}
        <div style={{
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.5px' }}>
            EVOLUTION PIPELINE
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Step 1: Active Phase 1 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)'
            }}>
              <Mic size={16} color="#34d399" />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#6ee7b7' }}>1. User Memory Session</span>
                  <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.3)', padding: '1px 6px', borderRadius: '4px', color: '#a7f3d0' }}>ACTIVE (Phase 1)</span>
                </div>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  Explicit start/stop recording, precision timing, local IndexedDB blob storage.
                </p>
              </div>
            </div>

            {/* Step 2: Speech to Text */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)'
            }}>
              <Cpu size={16} color="#818cf8" />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>2. Speech-to-Text & Speakers</span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>Phase 2</span>
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Whisper transcription & speaker diarization mapped to <code style={{ color: '#a5b4fc' }}>TranscriptData</code>.
                </p>
              </div>
            </div>

            {/* Step 3: Structured Memory & AI */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)'
            }}>
              <Sparkles size={16} color="#c084fc" />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>3. Structured AI Memory</span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>Phase 2</span>
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Action items, key decisions, topics, and contextual summaries.
                </p>
              </div>
            </div>

            {/* Step 4: Semantic Search & Assistant */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)'
            }}>
              <Search size={16} color="#38bdf8" />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>4. Semantic Search & Assistant</span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>Phase 2</span>
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
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
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '12px',
          color: '#c7d2fe'
        }}>
          <ShieldCheck size={18} color="#818cf8" />
          <span>
            Zero cloud telemetry or AI API calls in Phase 1. 100% on-device IndexedDB storage.
          </span>
        </div>

        <button className="btn-secondary" onClick={onClose} style={{ marginTop: '6px' }}>
          Close
        </button>
      </div>
    </div>
  );
};
