import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Send, Sparkles, X, Play, Clock, Tag, 
  CheckCircle2, ArrowRight, Loader2, RotateCcw, Brain, CheckSquare, 
  HelpCircle, Lightbulb, FileText, User 
} from 'lucide-react';
import { 
  MemorySession, 
  SearchResultItem, 
  AssistantChatMessage, 
  MemoryEmbeddingUnitType, 
  formatDuration 
} from '../models/session';
import { memoryVectorIndexService } from '../services/search/MemoryVectorIndexService';
import { memoryAssistantService } from '../services/assistant/MemoryAssistantService';
import { databaseService } from '../services/storage/database';

interface SearchAndAssistantViewProps {
  sessions: MemorySession[];
  onOpenSession: (session: MemorySession, seekToMs?: number) => void;
}

export const SearchAndAssistantView: React.FC<SearchAndAssistantViewProps> = ({
  sessions,
  onOpenSession,
}) => {
  const [activeMode, setActiveMode] = useState<'search' | 'assistant'>('search');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUnitType, setSelectedUnitType] = useState<MemoryEmbeddingUnitType | 'all'>('all');

  // Assistant Chat State
  const [chatMessages, setChatMessages] = useState<AssistantChatMessage[]>([]);
  const [assistantInput, setAssistantInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const msgs = await databaseService.getAssistantMessages();
        setChatMessages(msgs);
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };
    loadHistory();
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (activeMode === 'assistant') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeMode]);

  // Execute Semantic Search with debounce
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const unitTypes = selectedUnitType !== 'all' ? [selectedUnitType] : undefined;
        const results = await memoryVectorIndexService.search(trimmed, {
          unitTypes,
          limit: 25,
          minScore: 0.28
        });
        setSearchResults(results);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedUnitType]);

  // Send message to Assistant
  const handleSendQuestion = async (questionText?: string) => {
    const textToSend = questionText || assistantInput;
    if (!textToSend.trim() || isAsking) return;

    setAssistantInput('');
    setIsAsking(true);

    try {
      const reply = await memoryAssistantService.ask(textToSend);
      setChatMessages(prev => [...prev.filter(m => m.id !== reply.id), reply]);
      // Reload full history to ensure user message is also captured
      const allMsgs = await databaseService.getAssistantMessages();
      setChatMessages(allMsgs);
    } catch (err) {
      console.error('Assistant error:', err);
    } finally {
      setIsAsking(false);
    }
  };

  const handleClearHistory = async () => {
    await databaseService.clearAssistantMessages();
    setChatMessages([]);
  };

  const getUnitIcon = (type: MemoryEmbeddingUnitType) => {
    switch (type) {
      case 'decision': return <CheckCircle2 size={13} color="#10b981" />;
      case 'task': return <CheckSquare size={13} color="#f59e0b" />;
      case 'question': return <HelpCircle size={13} color="#38bdf8" />;
      case 'idea': return <Lightbulb size={13} color="#fbbf24" />;
      case 'summary': return <Brain size={13} color="#a78bfa" />;
      case 'person': return <User size={13} color="#94a3b8" />;
      default: return <FileText size={13} color="#94a3b8" />;
    }
  };

  const starterPrompts = [
    'What did I discuss with Rahul about our project?',
    'Why did we change the hardware?',
    'What tasks did I promise to complete this week?',
    'What decisions were made recently?'
  ];

  return (
    <div className="search-assistant-view">
      {/* Mode Switcher: Search vs Assistant */}
      <div className="search-mode-segmented-control">
        <button
          className={`segment-btn ${activeMode === 'search' ? 'is-active' : ''}`}
          onClick={() => setActiveMode('search')}
          id="btn-mode-search"
        >
          <Search size={14} />
          <span>Semantic Search</span>
        </button>
        <button
          className={`segment-btn ${activeMode === 'assistant' ? 'is-active' : ''}`}
          onClick={() => setActiveMode('assistant')}
          id="btn-mode-assistant"
        >
          <Sparkles size={14} />
          <span>Ask Assistant</span>
        </button>
      </div>

      {activeMode === 'search' ? (
        /* ================= 1. Semantic Search Mode ================= */
        <div className="search-mode-container">
          <div className="clean-search-bar">
            <Search size={17} className="clean-search-icon" />
            <input
              type="text"
              className="clean-search-input"
              placeholder="Search across all conversations, topics, decisions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              id="global-search-input"
            />
            {searchQuery && (
              <button 
                className="clean-search-clear" 
                onClick={() => setSearchQuery('')}
                aria-label="Clear Search"
              >
                <X size={15} />
              </button>
            )}
            {isSearching && <Loader2 size={16} className="spin-icon" color="#9ca3af" />}
          </div>

          {/* Filter Pills */}
          <div className="search-filter-pills-row">
            {(['all', 'decision', 'task', 'question', 'summary', 'transcript_chunk'] as const).map(type => (
              <button
                key={type}
                className={`filter-pill ${selectedUnitType === type ? 'is-active' : ''}`}
                onClick={() => setSelectedUnitType(type)}
              >
                {type === 'all' ? 'All Units' : 
                 type === 'transcript_chunk' ? 'Dialogue' : 
                 type.charAt(0).toUpperCase() + type.slice(1) + 's'}
              </button>
            ))}
          </div>

          {/* Results List */}
          <div className="search-results-list">
            {!searchQuery.trim() ? (
              <div className="search-empty-state">
                <div className="empty-state-icon-circle">
                  <Search size={22} color="#71717a" />
                </div>
                <h3>Natural Language Search</h3>
                <p>
                  Search by meaning, not just exact keywords. Try searching for concepts, questions, or decisions.
                </p>
                <div className="quick-suggestions-box">
                  <span className="suggestions-label">Try searching:</span>
                  <div className="suggestions-chips">
                    {starterPrompts.map((p, i) => (
                      <button 
                        key={i} 
                        className="suggestion-chip"
                        onClick={() => setSearchQuery(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : isSearching ? (
              <div className="search-loading-state">
                <Loader2 size={24} className="spin-icon" color="#9ca3af" />
                <p>Searching memory vectors...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="search-empty-state">
                <p>No memories found matching "{searchQuery}".</p>
              </div>
            ) : (
              searchResults.map((res) => {
                const session = sessions.find(s => s.id === res.record.sessionId);
                const scorePercent = Math.round(res.similarityScore * 100);

                return (
                  <div 
                    key={res.record.id} 
                    className="search-result-card"
                    onClick={() => {
                      if (session) {
                        onOpenSession(session, res.record.timestampMs);
                      }
                    }}
                  >
                    <div className="result-card-top">
                      <div className="result-type-badge">
                        {getUnitIcon(res.record.unitType)}
                        <span>{res.record.unitType.replace('_', ' ')}</span>
                      </div>
                      <span className="similarity-pill">
                        {scorePercent}% match
                      </span>
                    </div>

                    <p className="result-card-content">{res.record.content}</p>

                    <div className="result-card-footer">
                      <div className="result-session-meta">
                        <Tag size={11} color="#71717a" />
                        <span className="session-name">{res.record.sessionTitle}</span>
                        {res.record.timestampMs !== undefined && res.record.timestampMs > 0 && (
                          <span className="timestamp-badge">
                            <Clock size={10} />
                            {formatDuration(res.record.timestampMs)}
                          </span>
                        )}
                        {res.record.speakerLabel && (
                          <span className="speaker-pill">
                            {res.record.speakerLabel}
                          </span>
                        )}
                      </div>

                      <button className="jump-action-btn" title="Jump to moment in audio">
                        <Play size={10} fill="currentColor" />
                        <span>Jump</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* ================= 2. Conversational Assistant Mode ================= */
        <div className="assistant-mode-container">
          {chatMessages.length > 0 && (
            <div className="chat-toolbar">
              <span className="chat-thread-title">Personal Memory Assistant</span>
              <button className="clear-chat-btn" onClick={handleClearHistory} title="Clear conversation history">
                <RotateCcw size={12} />
                <span>Clear</span>
              </button>
            </div>
          )}

          <div className="chat-messages-scroll-area">
            {chatMessages.length === 0 ? (
              <div className="assistant-welcome-card">
                <div className="welcome-avatar-circle">
                  <Sparkles size={24} color="#f4f4f6" />
                </div>
                <h3>Ask Your Memory</h3>
                <p>
                  I answer questions using information from your recorded sessions, meetings, and notes.
                </p>

                <div className="starter-questions-grid">
                  {starterPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      className="starter-prompt-btn"
                      onClick={() => handleSendQuestion(prompt)}
                    >
                      <span>{prompt}</span>
                      <ArrowRight size={13} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatMessages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`chat-bubble-row ${msg.role === 'user' ? 'user-row' : 'assistant-row'}`}
                >
                  <div className={`chat-bubble ${msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
                    <div className="bubble-text">{msg.content}</div>

                    {/* Citations / Sources */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="bubble-citations">
                        <span className="citations-header">Source Citations:</span>
                        <div className="citations-chips-wrap">
                          {msg.citations.map((c, i) => {
                            const session = sessions.find(s => s.id === c.sessionId);
                            return (
                              <button
                                key={i}
                                className="citation-chip-btn"
                                onClick={() => {
                                  if (session) {
                                    onOpenSession(session, c.timestampMs);
                                  }
                                }}
                                title={`Open ${c.sessionTitle}`}
                              >
                                <Play size={9} fill="currentColor" />
                                <span className="citation-title">{c.sessionTitle}</span>
                                {c.timestampMs !== undefined && (
                                  <span className="citation-time">[{formatDuration(c.timestampMs)}]</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {isAsking && (
              <div className="chat-bubble-row assistant-row">
                <div className="chat-bubble assistant-bubble thinking">
                  <Loader2 size={16} className="spin-icon" color="#9ca3af" />
                  <span>Searching memories and formulating answer...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Assistant Input Bar */}
          <form 
            className="assistant-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuestion();
            }}
          >
            <input
              type="text"
              className="assistant-input"
              placeholder="Ask anything about your past conversations..."
              value={assistantInput}
              onChange={(e) => setAssistantInput(e.target.value)}
              disabled={isAsking}
              id="assistant-query-input"
            />
            <button 
              type="submit" 
              className="assistant-send-btn"
              disabled={!assistantInput.trim() || isAsking}
              aria-label="Send Question"
              id="btn-assistant-send"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
