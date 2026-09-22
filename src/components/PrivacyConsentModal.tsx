import React, { useState } from 'react';
import { ShieldCheck, Lock, Cloud, Cpu, ArrowRight, X } from 'lucide-react';
import { transcriptionService } from '../services/transcription/TranscriptionService';

interface PrivacyConsentModalProps {
  isOpen: boolean;
  onConfirm: (providerId: string) => void;
  onClose: () => void;
  sessionTitle: string;
}

export const PrivacyConsentModal: React.FC<PrivacyConsentModalProps> = ({
  isOpen,
  onConfirm,
  onClose,
  sessionTitle
}) => {
  const [selectedProvider, setSelectedProvider] = useState('backend');
  const providers = transcriptionService.getAvailableProviders();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-sheet" style={{ maxWidth: '460px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="privacy-chip">
              <Lock size={12} />
              <span>PRIVACY CONSENT</span>
            </span>
          </div>
          <button className="card-options-btn" onClick={onClose} title="Cancel">
            <X size={20} />
          </button>
        </div>

        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.3px' }}>
            Transcribe Memory Session
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', lineHeight: 1.4 }}>
            For session: <strong style={{ color: '#ffffff' }}>{sessionTitle}</strong>
          </p>
        </div>

        {/* Privacy Notice Card */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '12px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontSize: '12px',
          color: '#a7f3d0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#6ee7b7' }}>
            <ShieldCheck size={16} />
            <span>Your Data Guarantees</span>
          </div>
          <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', color: '#cbd5e1' }}>
            <li>Audio is processed only when explicitly approved by you.</li>
            <li>The original recording permanently remains in your device's local storage.</li>
            <li>No audio is permanently stored on external servers.</li>
          </ul>
        </div>

        {/* Engine Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Choose Transcription Engine
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {providers.map((p) => {
              const isSelected = selectedProvider === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProvider(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {p.isLocal ? <Cpu size={18} color="#34d399" /> : <Cloud size={18} color="#818cf8" />}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {p.isLocal ? '100% on-device simulation, offline capable' : 'High-precision Whisper proxy'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="transcriptionProvider"
                    checked={isSelected}
                    onChange={() => setSelectedProvider(p.id)}
                    style={{ accentColor: '#6366f1', cursor: 'pointer' }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button
            className="btn-secondary"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => onConfirm(selectedProvider)}
            style={{ flex: 2 }}
            id="btn-confirm-transcribe"
          >
            <span>Confirm & Transcribe</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
