import React from 'react';
import { Mic, Search, HardDrive, Smartphone, Monitor } from 'lucide-react';
import { formatFileSize } from '../models/session';

interface HeaderProps {
  isRecording: boolean;
  totalStorageBytes: number;
  sessionCount: number;
  isFullWidth: boolean;
  onToggleFullWidth: () => void;
  onQuickSearchClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isRecording,
  totalStorageBytes,
  sessionCount,
  isFullWidth,
  onToggleFullWidth,
  onQuickSearchClick,
}) => {
  return (
    <header className="app-header">
      <div className="brand-wrapper">
        <div className={`brand-logo-icon ${isRecording ? 'is-recording' : ''}`}>
          <Mic size={17} />
        </div>
        <div className="brand-title-group">
          <h1>Memory</h1>
        </div>
      </div>

      <div className="header-actions">
        {/* Active status indicator */}
        <div className={`status-pill ${isRecording ? 'recording' : ''}`}>
          <span className="status-dot"></span>
          <span>{isRecording ? 'Recording' : 'Ready'}</span>
        </div>

        {/* Quick Search trigger */}
        {onQuickSearchClick && (
          <button 
            className="header-icon-btn" 
            title="Search Memories"
            onClick={onQuickSearchClick}
            aria-label="Search"
          >
            <Search size={15} />
          </button>
        )}

        {/* Storage stats indicator */}
        <div 
          className="header-storage-pill" 
          title={`Local Storage: ${formatFileSize(totalStorageBytes)} across ${sessionCount} sessions`}
        >
          <HardDrive size={12} />
          <span>{formatFileSize(totalStorageBytes)}</span>
        </div>

        {/* Desktop width toggle (only on wide screens) */}
        <button 
          className="header-icon-btn desktop-only" 
          onClick={onToggleFullWidth}
          title={isFullWidth ? 'Switch to Mobile View' : 'Switch to Full Width'}
          aria-label="Toggle Full Width"
        >
          {isFullWidth ? <Smartphone size={14} /> : <Monitor size={14} />}
        </button>
      </div>
    </header>
  );
};
