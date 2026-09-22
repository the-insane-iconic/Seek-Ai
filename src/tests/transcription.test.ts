import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { databaseService } from '../services/storage/database';
import { MemorySession, TranscriptData, generateUUID } from '../models/session';
import { LocalSimulatedProvider } from '../services/transcription/providers/LocalSimulatedProvider';

describe('Phase 2: Speech-to-Text & Transcript Lifecycle', () => {
  beforeEach(async () => {
    const sessions = await databaseService.getAllSessions();
    for (const s of sessions) {
      await databaseService.deleteSession(s.id);
    }
  });

  afterEach(() => {
    databaseService.close();
  });

  it('generates structured transcript with segment and word timestamps via provider', async () => {
    const provider = new LocalSimulatedProvider();
    const mockAudioBlob = new Blob(['sample audio byte content simulated'], { type: 'audio/webm' });

    const transcript = await provider.transcribe(mockAudioBlob);

    expect(transcript).toBeDefined();
    expect(transcript.status).toBe('completed');
    expect(transcript.fullText.length).toBeGreaterThan(10);
    expect(transcript.segments.length).toBeGreaterThanOrEqual(2);

    // Verify first segment
    const firstSegment = transcript.segments[0];
    expect(firstSegment.startTimeMs).toBe(0);
    expect(firstSegment.endTimeMs).toBeGreaterThan(0);
    expect(firstSegment.text.length).toBeGreaterThan(0);

    // Verify word timestamps
    expect(firstSegment.words).toBeDefined();
    expect(firstSegment.words!.length).toBeGreaterThan(0);
    expect(firstSegment.words![0].startTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('persists transcript into session, edits text while preserving original audio and text', async () => {
    const sessionId = generateUUID();
    const mockAudio = new Blob(['original audio untouched'], { type: 'audio/webm' });
    await databaseService.saveAudioBlob(sessionId, mockAudio);

    const initialSession: MemorySession = {
      id: sessionId,
      title: 'Strategy Session',
      startTime: 1700000000000,
      endTime: 1700000060000,
      durationMs: 60000,
      audioStorageKey: `local://idb/audio_blobs/${sessionId}`,
      audioMimeType: 'audio/webm',
      audioSizeBytes: mockAudio.size,
      status: 'completed',
      createdAt: 1700000060000,
      updatedAt: 1700000060000
    };
    await databaseService.saveSession(initialSession);

    // 1. Associate transcript
    const initialTranscript: TranscriptData = {
      id: `tr_${sessionId}`,
      fullText: 'We agreed to build Phase 2 with full transcription.',
      language: 'en',
      segments: [
        {
          id: 'seg_1',
          startTimeMs: 0,
          endTimeMs: 4000,
          text: 'We agreed to build Phase 2 with full transcription.'
        }
      ],
      generatedAt: Date.now(),
      engine: 'test-engine',
      status: 'completed'
    };

    const withTranscript = await databaseService.updateSessionTranscript(sessionId, initialTranscript);
    expect(withTranscript.transcript).toBeDefined();
    expect(withTranscript.transcript?.status).toBe('completed');

    // 2. User edits transcript text
    const editedText = 'We agreed to build Phase 2 with modular transcription and responsive design.';
    const afterEdit = await databaseService.updateTranscriptText(sessionId, editedText);

    expect(afterEdit.transcript?.fullText).toBe(editedText);
    expect(afterEdit.transcript?.isEdited).toBe(true);
    expect(afterEdit.transcript?.originalText).toBe('We agreed to build Phase 2 with full transcription.');
    expect(afterEdit.transcript?.editedAt).toBeDefined();

    // 3. Verify original audio blob is still 100% intact and untouched
    const retrievedAudio = await databaseService.getAudioBlob(sessionId);
    expect(retrievedAudio).not.toBeNull();
    expect(retrievedAudio?.size).toBe(mockAudio.size);
  });

  it('records transcription failure status and error message cleanly', async () => {
    const sessionId = generateUUID();
    const session: MemorySession = {
      id: sessionId,
      title: 'Failed Recording Session',
      startTime: 1700000000000,
      endTime: 1700000010000,
      durationMs: 10000,
      audioStorageKey: `local://idb/audio_blobs/${sessionId}`,
      audioMimeType: 'audio/webm',
      audioSizeBytes: 5000,
      status: 'completed',
      createdAt: 1700000010000,
      updatedAt: 1700000010000
    };
    await databaseService.saveSession(session);

    // Set failed status
    const failedSession = await databaseService.updateTranscriptionStatus(
      sessionId, 
      'failed', 
      'Microphone packet corruption during transmission'
    );

    expect(failedSession.transcript?.status).toBe('failed');
    expect(failedSession.transcript?.error).toBe('Microphone packet corruption during transmission');
  });
});
