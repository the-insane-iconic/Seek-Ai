import React from 'react';
import { Mic, HardDrive, Layers, MessageSquare, Settings2, HelpCircle } from 'lucide-react';
import { formatFileSize } from '../models/session';
import { AppNavTab } from './BottomNav';

interface HeaderProps {
  isRecording: boolean;
  totalStorageBytes: number;
  sessionCount: number;
  activeNavTab: AppNavTab;
  onNavTabChange: (tab: AppNavTab) => void;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isRecording,
  totalStorageBytes,
  sessionCount,
  activeNavTab,
  onNavTabChange,
  onOpenGuide,
}) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand-wrapper">
          <div className={`brand-logo-icon ${isRecording ? 'is-recording' : ''}`}>
            <Mic size={16} />
          </div>
          <div className="brand-title-group">
            <h1>Seek AI</h1>
          </div>
        </div>

        {/* Desktop Top Navigation Tabs */}
        <nav className="desktop-nav-tabs" aria-label="Desktop Navigation">
          <button 
            className={`desktop-tab-btn ${activeNavTab === 'capture' ? 'is-active' : ''}`}
            onClick={() => onNavTabChange('capture')}
          >
            <Mic size={14} />
            <span>Capture</span>
          </button>
          <button 
            className={`desktop-tab-btn ${activeNavTab === 'memories' ? 'is-active' : ''}`}
            onClick={() => onNavTabChange('memories')}
          >
            <Layers size={14} />
            <span>Memories</span>
            {sessionCount > 0 && <span className="tab-count-badge">{sessionCount}</span>}
          </button>
          <button 
            className={`desktop-tab-btn ${activeNavTab === 'search' ? 'is-active' : ''}`}
            onClick={() => onNavTabChange('search')}
          >
            <MessageSquare size={14} />
            <span>Search & AI</span>
          </button>
          <button 
            className={`desktop-tab-btn ${activeNavTab === 'settings' ? 'is-active' : ''}`}
            onClick={() => onNavTabChange('settings')}
          >
            <Settings2 size={14} />
            <span>Settings</span>
          </button>
        </nav>
      </div>

      <div className="header-actions">
        {/* App Tour & Overview */}
        <button 
          type="button" 
          className="header-guide-btn" 
          onClick={onOpenGuide}
          title="App Overview & Feature Tour"
          aria-label="App Tour"
        >
          <HelpCircle size={13} />
          <span>Tour</span>
        </button>

        {/* Active status indicator */}
        <div className={`status-pill ${isRecording ? 'recording' : ''}`}>
          <span className="status-dot"></span>
          <span>{isRecording ? 'Recording' : 'Ready'}</span>
        </div>

        {/* Storage stats indicator */}
        <div 
          className="header-storage-pill" 
          title={`Local Storage: ${formatFileSize(totalStorageBytes)} across ${sessionCount} sessions`}
        >
          <HardDrive size={12} />
          <span>{formatFileSize(totalStorageBytes)}</span>
        </div>
      </div>
    </header>
  );
};
