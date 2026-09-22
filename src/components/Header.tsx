import React from 'react';
import { Mic, ShieldCheck, Database, Layers, Smartphone, Monitor, Users } from 'lucide-react';
import { formatFileSize } from '../models/session';

interface HeaderProps {
  isRecording: boolean;
  totalStorageBytes: number;
  sessionCount: number;
  isFullWidth: boolean;
  onToggleFullWidth: () => void;
  onOpenArchitecture: () => void;
  onOpenSpeakerPrivacy?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isRecording,
  totalStorageBytes,
  sessionCount,
  isFullWidth,
  onToggleFullWidth,
  onOpenArchitecture,
  onOpenSpeakerPrivacy,
}) => {
  return (
    <>
      {/* Desktop Helper Bar */}
      <div className="desktop-bar">
        <div className="desktop-bar-badge">
          <ShieldCheck size={12} />
          <span>PHASE 4 • SPEAKER & CONVERSATION SEGMENTS</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onOpenSpeakerPrivacy && (
            <button 
              className="desktop-bar-btn" 
              onClick={onOpenSpeakerPrivacy}
              title="Open Speaker Profiles & Voice Privacy Manager"
            >
              <Users size={12} />
              <span>Voice Privacy</span>
            </button>
          )}
          <button 
            className="desktop-bar-btn" 
            onClick={onOpenArchitecture}
            title="Inspect AI Pipeline Architecture"
          >
            <Layers size={12} />
            <span>Architecture</span>
          </button>
          <button 
            className="desktop-bar-btn" 
            onClick={onToggleFullWidth}
            title="Toggle Mobile / Fullscreen Container"
          >
            {isFullWidth ? <Smartphone size={12} /> : <Monitor size={12} />}
            <span>{isFullWidth ? 'Mobile View' : 'Full Width'}</span>
          </button>
        </div>
      </div>

      <header className="app-header">
        <div className="brand-wrapper">
          <div className="brand-logo-icon">
            <Mic size={18} />
          </div>
          <div className="brand-title-group">
            <h1>Memory</h1>
            <span>Personal AI System</span>
          </div>
        </div>

        <div className="header-actions">
          {/* Active status indicator */}
          <div className={`status-pill ${isRecording ? 'recording' : ''}`}>
            <span className="status-dot"></span>
            <span>{isRecording ? 'Active Session' : 'Ready'}</span>
          </div>

          {/* Quick Storage Info Icon */}
          <button 
            className="header-icon-btn" 
            title={`Local Storage: ${formatFileSize(totalStorageBytes)} across ${sessionCount} sessions`}
            onClick={onOpenArchitecture}
          >
            <Database size={15} />
          </button>
        </div>
      </header>
    </>
  );
};
