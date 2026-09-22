import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { databaseService } from '../services/storage/database';
import { MemorySession, TranscriptData, generateUUID } from '../models/session';
import { LocalSimulatedExtractionProvider } from '../services/extraction/providers/LocalSimulatedExtractionProvider';
import { validateExtractionResult } from '../services/extraction/types';
import { memoryExtractionService } from '../services/extraction/MemoryExtractionService';

describe('Phase 3: Structured Memory Extraction & Entity Lifecycle', () => {
  beforeEach(async () => {
    const sessions = await databaseService.getAllSessions();
    for (const s of sessions) {
      await databaseService.deleteSession(s.id);
    }
  });

  afterEach(() => {
    databaseService.close();
  });

  const sampleSegments = [
    {
      id: 'seg_1',
      startTimeMs: 0,
      endTimeMs: 5000,
      text: 'Rahul and Sarah agreed to build the modular architecture for speech transcription.'
    },
    {
      id: 'seg_2',
      startTimeMs: 5200,
      endTimeMs: 11000,
      text: 'Sarah, we need to complete the IndexedDB integration by Friday.'
    },
    {
      id: 'seg_3',
      startTimeMs: 11500,
      endTimeMs: 16000,
      text: 'What if we also support on-device offline extraction?'
    },
    {
      id: 'seg_4',
      startTimeMs: 16200,
      endTimeMs: 20000,
      text: 'Should we add speaker recognition in this phase?'
    },
    {
      id: 'seg_5',
      startTimeMs: 20500,
      endTimeMs: 25000,
      text: 'I will prepare the design documentation tomorrow.'
    }
  ];

  const fullTranscriptText = sampleSegments.map(s => s.text).join(' ');

  it('LocalSimulatedExtractionProvider extracts all categories with timestamps and passes schema validation', async () => {
    const provider = new LocalSimulatedExtractionProvider();
    const result = await provider.extract(fullTranscriptText, sampleSegments);

    expect(result).toBeDefined();
    expect(validateExtractionResult(result)).toBe(true);

    // 1. People
    expect(result.people.length).toBeGreaterThanOrEqual(2);
    const names = result.people.map(p => p.name);
    expect(names).toContain('Rahul');
    expect(names).toContain('Sarah');

    // 2. Topics
    expect(result.topics.length).toBeGreaterThan(0);
    const topicNames = result.topics.map(t => t.name);
    expect(topicNames.some(t => t.includes('Architecture') || t.includes('Speech'))).toBe(true);

    // 3. Decisions
    expect(result.decisions.length).toBeGreaterThan(0);
    expect(result.decisions[0].decision).toBeDefined();
    expect(result.decisions[0].sourceTimestampMs).toBeDefined();

    // 4. Tasks & Action Items
    expect(result.tasks.length).toBeGreaterThan(0);
    const task = result.tasks[0];
    expect(task.task).toBeDefined();
    expect(task.completed).toBe(false);
    expect(task.sourceTimestampMs).toBeDefined();

    // 5. Questions
    expect(result.questions.length).toBeGreaterThan(0);
    expect(result.questions.some(q => q.question.includes('?'))).toBe(true);

    // 6. Ideas
    expect(result.ideas.length).toBeGreaterThan(0);
    expect(result.ideas.some(i => i.idea.toLowerCase().includes('what if'))).toBe(true);

    // 7. Commitments
    expect(result.commitments.length).toBeGreaterThan(0);
    expect(result.commitments[0].commitment).toBeDefined();

    // 8. Dates & Deadlines
    expect(result.dates.length).toBeGreaterThan(0);
    expect(result.dates.some(d => d.date.toLowerCase() === 'friday' || d.date.toLowerCase() === 'tomorrow')).toBe(true);

    // 9. Events & Facts
    expect(result.keyPoints.length).toBeGreaterThan(0);
    expect(result.summary).toBeDefined();
    expect(result.summary?.oneLiner.length).toBeGreaterThan(5);
  });

  it('MemoryExtractionService orchestrates end-to-end extraction and updates IndexedDB session', async () => {
    const sessionId = generateUUID();
    const mockAudio = new Blob(['sample audio bytes'], { type: 'audio/webm' });
    await databaseService.saveAudioBlob(sessionId, mockAudio);

    const initialSession: MemorySession = {
      id: sessionId,
      title: 'Sprint Planning Meeting',
      startTime: 1700000000000,
      endTime: 1700000030000,
      durationMs: 30000,
      audioStorageKey: `local://idb/audio_blobs/${sessionId}`,
      audioMimeType: 'audio/webm',
      audioSizeBytes: mockAudio.size,
      status: 'completed',
      createdAt: 1700000030000,
      updatedAt: 1700000030000,
      transcript: {
        id: `tr_${sessionId}`,
        fullText: fullTranscriptText,
        language: 'en',
        segments: sampleSegments,
        generatedAt: 1700000035000,
        engine: 'test-engine',
        status: 'completed'
      }
    };
    await databaseService.saveSession(initialSession);

    // Run extraction through service using local provider for offline testing
    memoryExtractionService.setProvider('local');
    const structuredMem = await memoryExtractionService.extractMemory(initialSession);

    expect(structuredMem).toBeDefined();
    expect(structuredMem.status).toBe('completed');
    expect(structuredMem.people.length).toBeGreaterThanOrEqual(2);
    expect(structuredMem.tasks.length).toBeGreaterThan(0);

    // Verify session persisted in IndexedDB
    const reloaded = await databaseService.getSession(sessionId);
    expect(reloaded?.structuredMemory).toBeDefined();
    expect(reloaded?.structuredMemory?.sessionId).toBe(sessionId);
  });

  it('supports entity mutations: toggles tasks, updates items, adds new items, and deletes items', async () => {
    const sessionId = generateUUID();
    const initialSession: MemorySession = {
      id: sessionId,
      title: 'Product Review',
      startTime: 1700000000000,
      endTime: 1700000030000,
      durationMs: 30000,
      audioStorageKey: `local://idb/audio_blobs/${sessionId}`,
      audioMimeType: 'audio/webm',
      audioSizeBytes: 100,
      status: 'completed',
      createdAt: 1700000030000,
      updatedAt: 1700000030000
    };
    await databaseService.saveSession(initialSession);

    // Initial structured memory
    const memory = {
      id: `mem_${sessionId}`,
      sessionId,
      status: 'completed' as const,
      summary: {
        oneLiner: 'Initial executive summary.',
        keyTakeaways: ['Point 1']
      },
      people: [{ id: 'p_1', name: 'Alex', mentionCount: 1 }],
      topics: [{ id: 'top_1', name: 'Roadmap' }],
      keyPoints: [{ id: 'kp_1', point: 'Launch in Q3' }],
      questions: [{ id: 'q_1', question: 'When is the deadline?', status: 'open' as const }],
      ideas: [{ id: 'id_1', idea: 'Add dark mode' }],
      decisions: [{ id: 'dec_1', decision: 'Target iOS and Android' }],
      tasks: [{ id: 'task_1', task: 'Write tests', completed: false, assignee: 'Alex' }],
      commitments: [],
      dates: [],
      events: [],
      facts: [],
      extractedAt: Date.now(),
      modelUsed: 'test'
    };

    await databaseService.updateSessionStructuredMemory(sessionId, memory);

    // 1. Toggle task completion
    const afterTaskToggle = await databaseService.updateMemoryTaskStatus(sessionId, 'task_1', true);
    expect(afterTaskToggle.structuredMemory?.tasks[0].completed).toBe(true);
    expect(afterTaskToggle.structuredMemory?.tasks[0].isUserEdited).toBe(true);
    expect(afterTaskToggle.structuredMemory?.isUserEdited).toBe(true);

    // 2. Edit an existing decision
    const afterDecisionEdit = await databaseService.updateMemoryEntity(
      sessionId, 
      'decisions', 
      'dec_1', 
      { decision: 'Target Web, iOS, and Android' }
    );
    expect(afterDecisionEdit.structuredMemory?.decisions[0].decision).toBe('Target Web, iOS, and Android');
    expect(afterDecisionEdit.structuredMemory?.decisions[0].isUserEdited).toBe(true);

    // 3. Add a user-created entity
    const afterAdd = await databaseService.addMemoryEntity(
      sessionId,
      'ideas',
      { idea: 'Enable offline audio export' }
    );
    expect(afterAdd.structuredMemory?.ideas.length).toBe(2);
    const addedIdea = afterAdd.structuredMemory?.ideas.find(i => i.idea.includes('offline audio export'));
    expect(addedIdea).toBeDefined();
    expect(addedIdea?.isUserCreated).toBe(true);

    // 4. Delete an entity
    const afterDelete = await databaseService.deleteMemoryEntity(sessionId, 'questions', 'q_1');
    expect(afterDelete.structuredMemory?.questions.length).toBe(0);
  });

  it('guarantees audio and transcript integrity when structured memory is modified', async () => {
    const sessionId = generateUUID();
    const mockAudio = new Blob(['permanent pristine audio stream'], { type: 'audio/webm' });
    await databaseService.saveAudioBlob(sessionId, mockAudio);

    const transcriptData: TranscriptData = {
      id: `tr_${sessionId}`,
      fullText: 'Important audio statement.',
      language: 'en',
      segments: [{ id: 'seg_1', startTimeMs: 0, endTimeMs: 2000, text: 'Important audio statement.' }],
      generatedAt: Date.now(),
      engine: 'test-engine',
      status: 'completed'
    };

    const session: MemorySession = {
      id: sessionId,
      title: 'Integrity Test',
      startTime: 1700000000000,
      endTime: 1700000010000,
      durationMs: 10000,
      audioStorageKey: `local://idb/audio_blobs/${sessionId}`,
      audioMimeType: 'audio/webm',
      audioSizeBytes: mockAudio.size,
      status: 'completed',
      createdAt: 1700000010000,
      updatedAt: 1700000010000,
      transcript: transcriptData
    };
    await databaseService.saveSession(session);

    // Add structured memory and perform multiple mutations
    await databaseService.addMemoryEntity(sessionId, 'decisions', { decision: 'Critical strategy decision' });
    await databaseService.addMemoryEntity(sessionId, 'tasks', { task: 'Verify integrity', completed: true });

    // Verify transcript is untouched
    const retrievedSession = await databaseService.getSession(sessionId);
    expect(retrievedSession?.transcript?.fullText).toBe('Important audio statement.');
    expect(retrievedSession?.transcript?.segments.length).toBe(1);

    // Verify audio blob is untouched
    const retrievedAudio = await databaseService.getAudioBlob(sessionId);
    expect(retrievedAudio).not.toBeNull();
    expect(retrievedAudio?.size).toBe(mockAudio.size);
  });
});
