import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { databaseService } from '../services/storage/database';
import { LocalSimulatedExtractionProvider } from '../services/extraction/providers/LocalSimulatedExtractionProvider';
import { MemorySession, TranscriptData, TranscriptSegment } from '../models/session';

describe('Phase 4: Speaker-Attributed Structured Memory & Data Integrity', () => {
  const extractionProvider = new LocalSimulatedExtractionProvider();

  beforeEach(async () => {
    const sessions = await databaseService.getAllSessions();
    for (const s of sessions) {
      await databaseService.deleteSession(s.id);
    }
  });

  afterEach(() => {
    databaseService.close();
  });

  it('attributes decisions, tasks, questions, and commitments to specific speakers during extraction', async () => {
    const utterances: TranscriptSegment[] = [
      {
        id: 'u1',
        startTimeMs: 0,
        endTimeMs: 4000,
        text: 'What should our primary database strategy be for offline mode?',
        speakerId: 'sp_you',
        speakerLabel: 'You',
        confidence: 0.95
      },
      {
        id: 'u2',
        startTimeMs: 4500,
        endTimeMs: 9000,
        text: 'We decided and agreed to use IndexedDB for local storage.',
        speakerId: 'sp_rahul',
        speakerLabel: 'Rahul',
        confidence: 0.90
      },
      {
        id: 'u3',
        startTimeMs: 9500,
        endTimeMs: 14000,
        text: "I'll implement the segmentation algorithms by Monday.",
        speakerId: 'sp_rahul',
        speakerLabel: 'Rahul',
        confidence: 0.90
      },
      {
        id: 'u4',
        startTimeMs: 14500,
        endTimeMs: 18000,
        text: 'I promise to send the updated design assets tomorrow.',
        speakerId: 'sp_you',
        speakerLabel: 'You',
        confidence: 0.95
      }
    ];

    const transcript: TranscriptData = {
      id: 'tr_test_attributed',
      fullText: utterances.map(u => `${u.speakerLabel}: ${u.text}`).join('\n'),
      language: 'en',
      segments: utterances,
      generatedAt: Date.now(),
      engine: 'whisper',
      status: 'completed'
    };

    const memory = await extractionProvider.extract(transcript.fullText, transcript.segments);

    // 1. Verify Decision Attribution
    expect(memory.decisions.length).toBeGreaterThanOrEqual(1);
    const decision = memory.decisions.find(d => d.decision.toLowerCase().includes('indexeddb') || d.decision.toLowerCase().includes('agreed'));
    expect(decision).toBeDefined();
    expect(decision?.madeBy).toBeDefined();
    expect(decision?.madeBy).toContain('Rahul');

    // 2. Verify Task Attribution
    expect(memory.tasks.length).toBeGreaterThanOrEqual(1);
    const task = memory.tasks.find(t => t.task.toLowerCase().includes('segmentation') || t.task.toLowerCase().includes('implement'));
    expect(task).toBeDefined();
    expect(task?.assignedTo).toBe('Rahul');

    // 3. Verify Question Attribution
    expect(memory.questions.length).toBeGreaterThanOrEqual(1);
    const question = memory.questions.find(q => q.question.toLowerCase().includes('database') || q.question.toLowerCase().includes('offline'));
    expect(question).toBeDefined();
    expect(question?.askedBy).toBe('You');

    // 4. Verify Commitment Attribution
    expect(memory.commitments.length).toBeGreaterThanOrEqual(1);
    const commitment = memory.commitments.find(c => c.commitment.toLowerCase().includes('promise') || c.commitment.toLowerCase().includes('design'));
    expect(commitment).toBeDefined();
    expect(commitment?.fromPerson).toBe('You');
  });

  it('guarantees audio and transcript integrity when speakers or segments are modified', async () => {
    const sessionId = 'session-integrity-test';
    const audioBlob = new Blob(['sample-audio-stream-bytes-phase4'], { type: 'audio/webm' });
    await databaseService.saveAudioBlob(sessionId, audioBlob);

    const initialSession: MemorySession = {
      id: sessionId,
      title: 'Integrity Check Session',
      startTime: 1700000000000,
      endTime: 1700000030000,
      durationMs: 30000,
      audioStorageKey: `local://idb/audio_blobs/${sessionId}`,
      audioMimeType: 'audio/webm',
      audioSizeBytes: audioBlob.size,
      status: 'completed',
      createdAt: 1700000030000,
      updatedAt: 1700000030000,
      contextType: 'meeting',
      speakers: [
        {
          id: 'sp_anon_1',
          label: 'Speaker 1',
          isUser: false,
          confidence: 0.7,
          avatarColor: '#3b82f6',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ],
      conversationSegments: [
        {
          id: 'cseg_init',
          sessionId,
          title: 'Initial Segment',
          contextType: 'meeting',
          startTimeMs: 0,
          endTimeMs: 30000,
          speakerIds: ['sp_anon_1'],
          isUserEdited: false
        }
      ],
      transcript: {
        id: `tr_${sessionId}`,
        fullText: 'Speaker 1: Testing speaker renaming integrity.',
        originalText: 'Speaker 1: Testing speaker renaming integrity.',
        language: 'en',
        segments: [
          {
            id: 'seg_1',
            startTimeMs: 0,
            endTimeMs: 15000,
            text: 'Testing speaker renaming integrity.',
            speakerId: 'sp_anon_1',
            speakerLabel: 'Speaker 1',
            conversationSegmentId: 'cseg_init'
          }
        ],
        generatedAt: Date.now(),
        engine: 'whisper',
        status: 'completed'
      }
    };

    await databaseService.saveSession(initialSession);

    // 1. Rename speaker
    await databaseService.renameSpeaker(sessionId, 'sp_anon_1', 'Priya', false);

    // 2. Split segment
    await databaseService.splitConversationSegment(sessionId, 'cseg_init', 10000, 'Segment Part 2');

    // 3. Update context
    await databaseService.updateSessionContext(sessionId, 'interview', 'Senior Frontend Engineer');

    // 4. Verify that the original audio blob remains completely intact
    const fetchedAudio = await databaseService.getAudioBlob(sessionId);
    expect(fetchedAudio).not.toBeNull();
    expect(fetchedAudio?.size).toBe(audioBlob.size);
    expect(fetchedAudio?.type).toBe(audioBlob.type);

    // 5. Verify session updates
    const fetchedSession = await databaseService.getSession(sessionId);
    expect(fetchedSession).not.toBeNull();
    expect(fetchedSession?.contextType).toBe('interview');
    expect(fetchedSession?.customContext).toBe('Senior Frontend Engineer');
    expect(fetchedSession?.conversationSegments?.length).toBe(2);
    expect(fetchedSession?.speakers?.[0].name).toBe('Priya');
    expect(fetchedSession?.transcript?.segments[0].speakerLabel).toBe('Priya');
  });
});
