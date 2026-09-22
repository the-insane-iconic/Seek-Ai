import React, { useState, useEffect, useRef } from 'react';
import { 
  MemorySession, 
  generateUUID, 
  generateDefaultSessionTitle,
  StructuredMemory
} from './models/session';
import { databaseService } from './services/storage/database';
import { audioFileManager } from './services/storage/audioFileManager';
import { recordingService, RecordingState } from './services/audio/RecordingService';
import { transcriptionService } from './services/transcription/TranscriptionService';
import { memoryExtractionService } from './services/extraction/MemoryExtractionService';

import { Header } from './components/Header';
import { StartSessionCard } from './components/StartSessionCard';
import { ActiveRecordingModal } from './components/ActiveRecordingModal';
import { SessionList } from './components/SessionList';
import { SessionDetailModal } from './components/SessionDetailModal';
import { PermissionsBanner } from './components/PermissionsBanner';
import { ArchitectureModal } from './components/ArchitectureModal';

export const App: React.FC = () => {
  // Session State
  const [sessions, setSessions] = useState<MemorySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<MemorySession | null>(null);
  const [totalStorageBytes, setTotalStorageBytes] = useState(0);

  // Active Recording State
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | undefined>(undefined);
  const [activeModalOpen, setActiveModalOpen] = useState(false);

  // Transcription & Extraction Progress State
  const [transcriptionProgress, setTranscriptionProgress] = useState<{
    status: string;
    percent?: number;
    message?: string;
  } | null>(null);
  const [isExtractingMemory, setIsExtractingMemory] = useState(false);

  // Errors & Permissions
  const [errorType, setErrorType] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // UI View Modes
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [isArchitectureModalOpen, setIsArchitectureModalOpen] = useState(false);

  // Quick Playback State for Session Cards
  const [quickPlayingId, setQuickPlayingId] = useState<string | null>(null);
  const quickAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load initial sessions from IndexedDB
  const refreshSessions = async () => {
    try {
      const list = await databaseService.getAllSessions();
      setSessions(list);
      const stats = await databaseService.getStorageStats();
      setTotalStorageBytes(stats.totalAudioBytes);
      return list;
    } catch (err: any) {
      console.error('Failed to load sessions from database:', err);
      return [];
    }
  };

  useEffect(() => {
    refreshSessions();

    // Subscribe to RecordingService events
    const unsubState = recordingService.onStateChange((state) => {
      setRecordingState(state);
      if (state === 'recording') {
        setActiveModalOpen(true);
      }
    });

    const unsubTime = recordingService.onTimeUpdate((ms) => {
      setElapsedMs(ms);
    });

    const unsubAudio = recordingService.onAudioLevel((level, freqData) => {
      setAudioLevel(level);
      setFrequencyData(freqData);
    });

    const unsubError = recordingService.onError((err, code) => {
      setErrorType(code);
      setErrorMessage(err.message);
    });

    return () => {
      unsubState();
      unsubTime();
      unsubAudio();
      unsubError();
      audioFileManager.cleanupAllUrls();
    };
  }, []);

  // Quick audio player cleanup
  useEffect(() => {
    return () => {
      if (quickAudioRef.current) {
        quickAudioRef.current.pause();
        quickAudioRef.current = null;
      }
    };
  }, []);

  // Start a new Memory Session
  const handleStartSession = async () => {
    setErrorType(null);
    setErrorMessage(null);

    // Stop any active quick preview before recording
    if (quickAudioRef.current) {
      quickAudioRef.current.pause();
      setQuickPlayingId(null);
    }

    // Check storage quota
    const quota = await audioFileManager.checkStorageQuota();
    if (quota && quota.isLowStorage) {
      setErrorType('LOW_STORAGE');
      setErrorMessage('Device storage is almost full. Please free up space before recording.');
      return;
    }

    try {
      await recordingService.startRecording();
      setActiveModalOpen(true);
    } catch (err: any) {
      console.error('Start recording failed:', err);
    }
  };

  // Pause active session
  const handlePauseSession = () => {
    recordingService.pauseRecording();
  };

  // Resume active session
  const handleResumeSession = () => {
    recordingService.resumeRecording();
  };

  // Stop and save active session
  const handleStopSession = async () => {
    try {
      const result = await recordingService.stopRecording();
      setActiveModalOpen(false);

      const sessionId = generateUUID();
      const startTime = Date.now() - result.durationMs;
      const endTime = Date.now();

      // Store binary audio blob in IndexedDB
      const storageKey = await audioFileManager.storeRecording(sessionId, result.blob);

      // Create session metadata record
      const newSession: MemorySession = {
        id: sessionId,
        title: generateDefaultSessionTitle(startTime),
        startTime,
        endTime,
        durationMs: result.durationMs,
        audioStorageKey: storageKey,
        audioMimeType: result.mimeType,
        audioSizeBytes: result.sizeBytes,
        status: 'completed',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Save metadata to IndexedDB
      await databaseService.saveSession(newSession);
      await refreshSessions();

      // Open detail modal to let user listen and transcribe
      setSelectedSession(newSession);
    } catch (err: any) {
      console.error('Failed to stop and save session:', err);
      setErrorType('SAVE_FAILED');
      setErrorMessage(`Failed to save recording: ${err.message}`);
    }
  };

  // Discard active recording without saving
  const handleDiscardSession = () => {
    recordingService.discardRecording();
    setActiveModalOpen(false);
    setElapsedMs(0);
    setAudioLevel(0);
  };

  // Rename session
  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    try {
      const updated = await databaseService.updateSessionTitle(sessionId, newTitle);
      await refreshSessions();
      if (selectedSession && selectedSession.id === sessionId) {
        setSelectedSession(updated);
      }
    } catch (err: any) {
      console.error('Failed to rename session:', err);
    }
  };

  // Delete session
  const handleDeleteSession = async (sessionId: string) => {
    try {
      if (quickPlayingId === sessionId && quickAudioRef.current) {
        quickAudioRef.current.pause();
        setQuickPlayingId(null);
      }
      audioFileManager.revokePlaybackUrl(sessionId);
      await databaseService.deleteSession(sessionId);
      await refreshSessions();
      if (selectedSession && selectedSession.id === sessionId) {
        setSelectedSession(null);
      }
    } catch (err: any) {
      console.error('Failed to delete session:', err);
    }
  };

  // Transcribe session handler
  const handleTranscribeSession = async (session: MemorySession, providerId: string) => {
    setTranscriptionProgress({
      status: 'waiting',
      percent: 10,
      message: 'Initializing speech-to-text...'
    });

    try {
      await transcriptionService.transcribeSession(session, {
        providerId,
        onProgress: (status, percent, message) => {
          setTranscriptionProgress({ status, percent, message });
        }
      });

      let updated = await databaseService.getSession(session.id);
      if (updated) {
        setSelectedSession(updated);
        // Automatically extract structured memory once transcription completes!
        try {
          await handleExtractMemory(updated);
        } catch (e) {
          console.warn('Auto-extraction non-fatal error:', e);
        }
      }
      await refreshSessions();
    } catch (err: any) {
      console.error('Transcription failed:', err);
      const updated = await databaseService.getSession(session.id);
      if (updated) {
        setSelectedSession(updated);
      }
      await refreshSessions();
    } finally {
      setTimeout(() => {
        setTranscriptionProgress(null);
      }, 1200);
    }
  };

  // Edit transcript text
  const handleSaveTranscriptEdit = async (sessionId: string, newText: string) => {
    try {
      const updated = await databaseService.updateTranscriptText(sessionId, newText);
      setSelectedSession(updated);
      await refreshSessions();
    } catch (err: any) {
      console.error('Failed to save transcript edit:', err);
    }
  };

  // Retry failed transcription
  const handleRetryTranscribe = async (session: MemorySession) => {
    await handleTranscribeSession(session, 'backend');
  };

  // Phase 3: Extract Structured Memory
  const handleExtractMemory = async (session: MemorySession, providerId?: string) => {
    setIsExtractingMemory(true);
    try {
      await memoryExtractionService.extractMemory(session, { providerId });
      const updated = await databaseService.getSession(session.id);
      if (updated) {
        setSelectedSession(updated);
      }
      await refreshSessions();
    } catch (err: any) {
      console.error('Memory extraction error:', err);
      const updated = await databaseService.getSession(session.id);
      if (updated) {
        setSelectedSession(updated);
      }
      await refreshSessions();
    } finally {
      setIsExtractingMemory(false);
    }
  };

  // Phase 3: Toggle Task Completion
  const handleToggleTask = async (sessionId: string, taskId: string, completed: boolean) => {
    try {
      const updated = await databaseService.updateMemoryTaskStatus(sessionId, taskId, completed);
      setSelectedSession(updated);
      await refreshSessions();
    } catch (err) {
      console.error('Failed to toggle task status:', err);
    }
  };

  // Phase 3: Update Extracted Entity
  const handleUpdateEntity = async (
    sessionId: string, 
    category: keyof StructuredMemory, 
    itemId: string, 
    fields: any
  ) => {
    try {
      const updated = await databaseService.updateMemoryEntity(sessionId, category, itemId, fields);
      setSelectedSession(updated);
      await refreshSessions();
    } catch (err) {
      console.error('Failed to update entity:', err);
    }
  };

  // Phase 3: Delete Extracted Entity
  const handleDeleteEntity = async (
    sessionId: string, 
    category: keyof StructuredMemory, 
    itemId: string
  ) => {
    try {
      const updated = await databaseService.deleteMemoryEntity(sessionId, category, itemId);
      setSelectedSession(updated);
      await refreshSessions();
    } catch (err) {
      console.error('Failed to delete entity:', err);
    }
  };

  // Phase 3: Add Custom Entity
  const handleAddEntity = async (
    sessionId: string, 
    category: keyof StructuredMemory, 
    item: any
  ) => {
    try {
      const updated = await databaseService.addMemoryEntity(sessionId, category, item);
      setSelectedSession(updated);
      await refreshSessions();
    } catch (err) {
      console.error('Failed to add entity:', err);
    }
  };

  // Quick Play/Pause preview from Session Card
  const handleQuickPlay = async (session: MemorySession) => {
    if (quickPlayingId === session.id) {
      // Toggle pause
      if (quickAudioRef.current) {
        quickAudioRef.current.pause();
      }
      setQuickPlayingId(null);
      return;
    }

    try {
      const url = await audioFileManager.getPlaybackUrl(session.id);
      if (!url) return;

      if (quickAudioRef.current) {
        quickAudioRef.current.pause();
      }

      const audio = new Audio(url);
      quickAudioRef.current = audio;
      setQuickPlayingId(session.id);

      audio.onended = () => {
        setQuickPlayingId(null);
      };

      await audio.play();
    } catch (err) {
      console.error('Quick play error:', err);
      setQuickPlayingId(null);
    }
  };

  const isRecordingActive = recordingState === 'recording' || recordingState === 'paused';
  const isPaused = recordingState === 'paused';

  return (
    <div className={`app-container ${isFullWidth ? 'full-width-mode' : ''}`}>
      {/* App Header */}
      <Header
        isRecording={isRecordingActive}
        totalStorageBytes={totalStorageBytes}
        sessionCount={sessions.length}
        isFullWidth={isFullWidth}
        onToggleFullWidth={() => setIsFullWidth(!isFullWidth)}
        onOpenArchitecture={() => setIsArchitectureModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="app-content">
        {/* Permission / Hardware Alerts Banner */}
        <PermissionsBanner
          errorType={errorType}
          errorMessage={errorMessage}
          onRetry={handleStartSession}
          onDismiss={() => {
            setErrorType(null);
            setErrorMessage(null);
          }}
        />

        {/* Hero: Start / Active Memory Session Action Card */}
        <StartSessionCard
          isRecording={isRecordingActive}
          isPaused={isPaused}
          elapsedMs={elapsedMs}
          onStartSession={handleStartSession}
          onOpenActiveModal={() => setActiveModalOpen(true)}
        />

        {/* Previous Sessions List & Aggregates */}
        <SessionList
          sessions={sessions}
          onSelectSession={(s) => setSelectedSession(s)}
          onPlayQuick={handleQuickPlay}
          playingSessionId={quickPlayingId}
        />
      </main>

      {/* Active Recording Modal / Sheet */}
      <ActiveRecordingModal
        isOpen={activeModalOpen && isRecordingActive}
        isPaused={isPaused}
        elapsedMs={elapsedMs}
        level={audioLevel}
        frequencyData={frequencyData}
        onPause={handlePauseSession}
        onResume={handleResumeSession}
        onStop={handleStopSession}
        onDiscard={handleDiscardSession}
        onMinimize={() => setActiveModalOpen(false)}
      />

      {/* Session Details Modal (Playback, Metadata, Rename, Delete, Phase 2 Transcripts, Phase 3 Structured Memory) */}
      <SessionDetailModal
        session={selectedSession}
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        onRename={handleRenameSession}
        onDelete={handleDeleteSession}
        onTranscribe={handleTranscribeSession}
        onSaveTranscriptEdit={handleSaveTranscriptEdit}
        onRetryTranscribe={handleRetryTranscribe}
        transcriptionProgress={transcriptionProgress}
        onExtractMemory={handleExtractMemory}
        onToggleTask={handleToggleTask}
        onUpdateEntity={handleUpdateEntity}
        onDeleteEntity={handleDeleteEntity}
        onAddEntity={handleAddEntity}
        isExtractingMemory={isExtractingMemory}
      />

      {/* Architecture & Pipeline Modal */}
      <ArchitectureModal
        isOpen={isArchitectureModalOpen}
        onClose={() => setIsArchitectureModalOpen(false)}
      />
    </div>
  );
};

export default App;
