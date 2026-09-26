import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, ChevronRight, ChevronLeft, Mic, Sparkles, 
  Users, Search, ShieldCheck, Check, 
  ArrowRight, CheckSquare, MessageSquare, Play
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface OnboardingSlide {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  icon: React.ReactNode;
  renderPreview: () => React.ReactNode;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: OnboardingSlide[] = [
    {
      id: 'welcome',
      badge: 'WELCOME TO SEEK AI',
      title: 'Your Private Memory Vault',
      subtitle: 'Effortlessly capture, organize, and recall your daily life',
      description: 'Seek AI is an intelligent, voice-first memory companion that runs 100% on your device. Capture meetings, lectures, and spontaneous ideas with zero cloud surveillance.',
      highlights: [
        '100% private: stored in your browser’s IndexedDB',
        'Zero cloud tracking or third-party data collection',
        'Built for fast, seamless audio recording and recall'
      ],
      icon: <Sparkles size={20} className="onboarding-header-icon" />,
      renderPreview: () => (
        <div className="onboarding-preview-card intro-card">
          <div className="preview-vault-badge">
            <ShieldCheck size={16} />
            <span>On-Device Vault • Active</span>
          </div>
          <div className="preview-vault-stats">
            <div className="preview-stat-item">
              <span className="stat-label">STORAGE</span>
              <span className="stat-value">Local IndexedDB</span>
            </div>
            <div className="preview-stat-item">
              <span className="stat-label">PRIVACY</span>
              <span className="stat-value">Client-Side Only</span>
            </div>
            <div className="preview-stat-item">
              <span className="stat-label">CLOUD SYNC</span>
              <span className="stat-value">Disabled (Private)</span>
            </div>
          </div>
          <p className="preview-vault-subtext">
            All audio files, transcripts, speaker profiles, and intelligence graphs reside exclusively in your browser.
          </p>
        </div>
      )
    },
    {
      id: 'capture',
      badge: 'CAPABILITY 1 OF 4',
      title: 'One-Tap Voice Capture',
      subtitle: 'High-fidelity audio recording with live waveform feedback',
      description: 'Record any conversation or voice note with a single tap. Monitor input levels in real-time with dynamic waveform visualizers, with full pause, resume, and background resilience.',
      highlights: [
        'Real-time frequency visualizer & VU sound meter',
        'Seamless pause, resume, or discard controls',
        'Automatic persistent chunking into IndexedDB'
      ],
      icon: <Mic size={20} className="onboarding-header-icon" />,
      renderPreview: () => (
        <div className="onboarding-preview-card capture-card">
          <div className="preview-rec-header">
            <div className="preview-rec-pill">
              <span className="preview-rec-dot"></span>
              <span>Recording</span>
            </div>
            <span className="preview-rec-timer">03:42</span>
          </div>
          <div className="preview-wave-row" aria-label="Visualizer waveform">
            {[35, 60, 40, 85, 95, 70, 45, 90, 100, 65, 80, 50, 75, 40, 90, 85, 60, 45].map((h, i) => (
              <span 
                key={i} 
                className="preview-wave-bar" 
                style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }} 
              />
            ))}
          </div>
          <div className="preview-rec-controls">
            <button type="button" className="preview-ctrl-btn" tabIndex={-1}>Pause</button>
            <button type="button" className="preview-ctrl-btn primary" tabIndex={-1}>Finish Session</button>
            <button type="button" className="preview-ctrl-btn discard" tabIndex={-1}>Discard</button>
          </div>
        </div>
      )
    },
    {
      id: 'transcribe',
      badge: 'CAPABILITY 2 OF 4',
      title: 'Transcribe & Identify Speakers',
      subtitle: 'Word-for-word accuracy and automatic voice diarization',
      description: 'Convert spoken words into timestamped transcripts. Speaker diarization separates distinct voices automatically and lets you label your voice as “You”. Long recordings are organized into context chapters.',
      highlights: [
        'Word- and segment-level playback timestamps',
        'Automatic multi-speaker diarization and profile manager',
        'Conversation context segmentation (meetings, lectures, chats)'
      ],
      icon: <Users size={20} className="onboarding-header-icon" />,
      renderPreview: () => (
        <div className="onboarding-preview-card diarize-card">
          <div className="preview-chat-bubble you">
            <div className="preview-chat-meta">
              <span className="preview-chat-speaker">You</span>
              <span className="preview-chat-time">00:15</span>
            </div>
            <p className="preview-chat-text">
              “Let’s ensure all transcripts and vector embeddings stay strictly on-device.”
            </p>
          </div>
          <div className="preview-chat-bubble other">
            <div className="preview-chat-meta">
              <span className="preview-chat-speaker">Alex (Speaker 2)</span>
              <span className="preview-chat-time">00:28</span>
            </div>
            <p className="preview-chat-text">
              “Agreed. I’ll finalize the IndexedDB indexing pipeline by Friday.”
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'extract',
      badge: 'CAPABILITY 3 OF 4',
      title: 'Structured Memory & Action Items',
      subtitle: 'Turn spoken dialogue into structured, actionable intelligence',
      description: 'Stop manually writing notes. Seek AI analyzes the transcript to extract actionable tasks with assignees and due dates, key decisions made, commitments, topics, and people referenced.',
      highlights: [
        'Interactive tasks with checkboxes, assignees & deadlines',
        'Core decisions and commitments log',
        'Editable entities and structured topic indexing'
      ],
      icon: <CheckSquare size={20} className="onboarding-header-icon" />,
      renderPreview: () => (
        <div className="onboarding-preview-card extract-card">
          <div className="preview-extract-item task">
            <div className="preview-check-box checked">
              <Check size={12} />
            </div>
            <div className="preview-extract-info">
              <span className="preview-extract-title">Finalize IndexedDB indexing pipeline</span>
              <span className="preview-extract-meta">Assignee: Alex • Due: Friday</span>
            </div>
          </div>
          <div className="preview-extract-item decision">
            <span className="preview-decision-badge">DECISION</span>
            <span className="preview-extract-title">Store all audio recordings and embeddings locally</span>
          </div>
          <div className="preview-topics-row">
            <span className="preview-topic-tag">#Architecture</span>
            <span className="preview-topic-tag">#LocalFirst</span>
            <span className="preview-topic-tag">#Privacy</span>
          </div>
        </div>
      )
    },
    {
      id: 'search',
      badge: 'CAPABILITY 4 OF 4',
      title: 'Global Search & AI Assistant',
      subtitle: 'Ask anything about your past conversations in plain English',
      description: 'Search across all past recordings with natural language. The conversational AI assistant synthesizes answers across your sessions and provides clickable citations linking directly to exact audio playback timestamps.',
      highlights: [
        'Semantic vector & text search across all sessions',
        'Conversational assistant with cited source references',
        'One-click jump to exact audio playback moments'
      ],
      icon: <Search size={20} className="onboarding-header-icon" />,
      renderPreview: () => (
        <div className="onboarding-preview-card search-card">
          <div className="preview-search-input">
            <Search size={14} className="preview-search-icon" />
            <span>“What did Alex commit to do by Friday?”</span>
          </div>
          <div className="preview-assistant-reply">
            <div className="preview-assistant-header">
              <MessageSquare size={13} />
              <span>Memory Assistant</span>
            </div>
            <p className="preview-assistant-text">
              Alex committed to finalizing the IndexedDB indexing pipeline by Friday.
            </p>
            <div className="preview-citation-chip">
              <Play size={10} />
              <span>Sync with Alex • 00:28</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleNext = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onComplete();
    }
  }, [currentSlide, slides.length, onComplete]);

  const handlePrev = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  }, [currentSlide]);

  // Keyboard navigation: ArrowRight / ArrowLeft / Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen) return null;

  const current = slides[currentSlide];
  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="modal-overlay onboarding-modal-overlay" role="dialog" aria-modal="true" aria-label="Welcome and Application Tour">
      <div className="modal-sheet onboarding-modal-sheet">
        {/* Top Header Row */}
        <div className="onboarding-top-bar">
          <div className="onboarding-step-indicator">
            <span className="onboarding-step-counter">Step {currentSlide + 1} of {slides.length}</span>
            <span className="onboarding-slide-badge">{current.badge}</span>
          </div>

          <button 
            type="button" 
            className="onboarding-skip-btn" 
            onClick={onClose}
            aria-label="Skip Tour"
          >
            <span>Skip tour</span>
            <X size={15} />
          </button>
        </div>

        {/* Main Slide Content */}
        <div className="onboarding-slide-content">
          <div className="onboarding-text-column">
            <div className="onboarding-icon-title-row">
              <div className="onboarding-icon-wrap">
                {current.icon}
              </div>
              <div>
                <h2 className="onboarding-slide-title">{current.title}</h2>
                <p className="onboarding-slide-subtitle">{current.subtitle}</p>
              </div>
            </div>

            <p className="onboarding-slide-desc">
              {current.description}
            </p>

            <ul className="onboarding-highlights-list">
              {current.highlights.map((highlight, idx) => (
                <li key={idx} className="onboarding-highlight-item">
                  <div className="onboarding-check-icon">
                    <Check size={12} />
                  </div>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Interactive Preview Illustration */}
          <div className="onboarding-visual-column">
            {current.renderPreview()}
          </div>
        </div>

        {/* Bottom Navigation & Pagination Bar */}
        <div className="onboarding-bottom-bar">
          {/* Progress dots */}
          <div className="onboarding-dots-row" role="tablist" aria-label="Slide dots">
            {slides.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={idx === currentSlide}
                className={`onboarding-dot ${idx === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(idx)}
                title={`Jump to slide ${idx + 1}: ${slide.title}`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="onboarding-action-buttons">
            {!isFirstSlide && (
              <button 
                type="button" 
                className="btn-secondary onboarding-back-btn" 
                onClick={handlePrev}
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>
            )}

            {isLastSlide ? (
              <button 
                type="button" 
                className="btn-primary onboarding-start-btn" 
                onClick={onComplete}
              >
                <span>Get Started</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button 
                type="button" 
                className="btn-primary onboarding-next-btn" 
                onClick={handleNext}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
