import React from 'react';
import { Mic, Layers, MessageSquare, Settings2 } from 'lucide-react';

export type AppNavTab = 'capture' | 'memories' | 'search' | 'settings';

interface BottomNavProps {
  activeTab: AppNavTab;
  onTabChange: (tab: AppNavTab) => void;
  isRecording?: boolean;
  sessionsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  isRecording = false,
  sessionsCount = 0,
}) => {
  return (
    <nav className="bottom-nav-container" aria-label="Main Navigation">
      <div className="bottom-nav-inner">
        <button
          className={`nav-tab-btn ${activeTab === 'capture' ? 'is-active' : ''}`}
          onClick={() => onTabChange('capture')}
          aria-label="Capture Audio"
          id="nav-tab-capture"
        >
          <div className="nav-tab-icon-wrapper">
            <Mic size={19} />
            {isRecording && <span className="nav-recording-indicator" />}
          </div>
          <span className="nav-tab-label">Capture</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'memories' ? 'is-active' : ''}`}
          onClick={() => onTabChange('memories')}
          aria-label="View Memories"
          id="nav-tab-memories"
        >
          <div className="nav-tab-icon-wrapper">
            <Layers size={19} />
            {sessionsCount > 0 && <span className="nav-count-badge">{sessionsCount}</span>}
          </div>
          <span className="nav-tab-label">Memories</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'search' ? 'is-active' : ''}`}
          onClick={() => onTabChange('search')}
          aria-label="Search and AI Assistant"
          id="nav-tab-search"
        >
          <div className="nav-tab-icon-wrapper">
            <MessageSquare size={19} />
          </div>
          <span className="nav-tab-label">Search & AI</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'settings' ? 'is-active' : ''}`}
          onClick={() => onTabChange('settings')}
          aria-label="Settings and Privacy"
          id="nav-tab-settings"
        >
          <div className="nav-tab-icon-wrapper">
            <Settings2 size={19} />
          </div>
          <span className="nav-tab-label">Settings</span>
        </button>
      </div>
    </nav>
  );
};
