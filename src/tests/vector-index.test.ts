import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { databaseService } from '../services/storage/database';
import { memoryVectorIndexService } from '../services/search/MemoryVectorIndexService';
import { localSemanticVectorEngine } from '../services/search/providers/LocalSemanticVectorEngine';
import { MemorySession } from '../models/session';

describe('Phase 5: MemoryVectorIndexService & LocalSemanticVectorEngine', () => {
  beforeEach(async () => {
    const sessions = await databaseService.getAllSessions();
    for (const s of sessions) {
      await databaseService.deleteSession(s.id);
    }
  });

  afterEach(() => {
    databaseService.close();
  });

  it('generates normalized 128-dimension dense embeddings with concept clusters', async () => {
    const vector1 = await localSemanticVectorEngine.embed('The Raspberry Pi was consuming too much power, so switch to ESP32');
    const vector2 = await localSemanticVectorEngine.embed('Why did we change the hardware?');
    const unrelatedVector = await localSemanticVectorEngine.embed('Baking a chocolate cake recipe with flour and sugar');

    expect(vector1.length).toBe(128);
    expect(vector2.length).toBe(128);
    expect(unrelatedVector.length).toBe(128);

    // Compute norm of vector1 to verify normalization
    let norm1 = 0;
    for (const v of vector1) norm1 += v * v;
    expect(Math.sqrt(norm1)).toBeCloseTo(1, 2);

    // Compute cosine similarities
    const simHardware = localSemanticVectorEngine.cosineSimilarity(vector1, vector2);
    const simUnrelated = localSemanticVectorEngine.cosineSimilarity(vector1, unrelatedVector);

    // Hardware query should have significantly higher conceptual similarity than unrelated baking recipe
    expect(simHardware).toBeGreaterThan(0.35);
    expect(simHardware).toBeGreaterThan(simUnrelated);
  });

  it('indexes a complex session into granular semantic units in IndexedDB', async () => {
    const session: MemorySession = {
      id: 'session-hardware-1',
      title: 'IoT Embedded Architecture Review',
      startTime: 1700000000000,
      endTime: 1700000600000,
      durationMs: 600000,
      audioStorageKey: 'local://idb/audio_blobs/session-hardware-1',
      audioMimeType: 'audio/webm',
      audioSizeBytes: 120000,
      status: 'completed',
      createdAt: 1700000600000,
      updatedAt: 1700000600000,
      transcript: {
        id: 'tr-1',
        fullText: "The Raspberry Pi was consuming too much power in field deployment, so let's switch to the ESP32 micro-controller.",
        language: 'en',
        generatedAt: 1700000600000,
        engine: 'local-test',
        status: 'completed',
        segments: [
          {
            id: 'seg-1',
            text: "The Raspberry Pi was consuming too much power in field deployment, so let's switch to the ESP32 micro-controller.",
            startTimeMs: 12000,
            endTimeMs: 24000,
            speakerLabel: 'Speaker 1',
            confidence: 0.96
          }
        ]
      },
      structuredMemory: {
        id: 'mem-1',
        sessionId: 'session-hardware-1',
        status: 'completed',
        extractedAt: 1700000600000,
        modelUsed: 'local-test',
        summary: {
          oneLiner: "Team decided to change the embedded hardware from Raspberry Pi to ESP32 due to severe battery drain.",
          keyTakeaways: ["Raspberry Pi consumed too much power", "Switching to ESP32"]
        },
        people: [{ id: 'p1', name: 'Rahul', role: 'Hardware Lead', mentionCount: 3 }],
        topics: [{ id: 't1', name: 'Hardware Selection & Power Management' }],
        keyPoints: [{ id: 'kp1', point: 'Field testing showed 48hr battery depletion on Raspberry Pi', sourceTimestampMs: 14000 }],
        decisions: [{ id: 'd1', decision: 'Switch microcontroller platform to ESP32 for production batch', sourceTimestampMs: 22000 }],
        tasks: [{ id: 'tsk1', task: 'Order 5 ESP32 development boards and test sleep currents', assignedTo: 'Rahul', dueDate: 'Friday', completed: false }],
        questions: [{ id: 'q1', question: 'Does ESP32 support our SPI display sensor driver?', status: 'open' }],
        ideas: [{ id: 'i1', idea: 'Implement deep sleep interval of 10 minutes between sensor readings' }],
        commitments: [],
        dates: [{ id: 'dd1', date: 'Friday', description: 'ESP32 sample evaluation' }],
        events: [],
        facts: []
      },
      conversationSegments: [
        {
          id: 'conv-seg-1',
          sessionId: 'session-hardware-1',
          title: 'Power Optimization & Microcontroller Switch',
          contextType: 'project',
          startTimeMs: 10000,
          endTimeMs: 45000,
          speakerIds: ['speaker_1'],
          summary: 'Detailed evaluation of battery draw between Raspberry Pi and ESP32'
        }
      ]
    };

    await databaseService.saveSession(session);

    // Index the session
    const indexedCount = await memoryVectorIndexService.indexSession(session);
    expect(indexedCount).toBeGreaterThanOrEqual(8);

    // Retrieve indexed vector records for session
    const vectors = await databaseService.getVectorsBySessionId('session-hardware-1');
    expect(vectors.length).toBe(indexedCount);

    const unitTypes = new Set(vectors.map(v => v.unitType));
    expect(unitTypes.has('transcript_chunk')).toBe(true);
    expect(unitTypes.has('summary')).toBe(true);
    expect(unitTypes.has('decision')).toBe(true);
    expect(unitTypes.has('task')).toBe(true);
    expect(unitTypes.has('conversation_segment')).toBe(true);
  });

  it('performs semantic similarity search answering conceptual queries without exact word matches', async () => {
    const session: MemorySession = {
      id: 'session-hardware-2',
      title: 'IoT Embedded Architecture Review',
      startTime: 1700000000000,
      endTime: 1700000600000,
      durationMs: 600000,
      audioStorageKey: 'local://idb/audio_blobs/session-hardware-2',
      audioMimeType: 'audio/webm',
      audioSizeBytes: 120000,
      status: 'completed',
      createdAt: 1700000600000,
      updatedAt: 1700000600000,
      transcript: {
        id: 'tr-2',
        fullText: "The Raspberry Pi was consuming too much power, so let's switch to ESP32.",
        language: 'en',
        generatedAt: 1700000600000,
        engine: 'local-test',
        status: 'completed',
        segments: [
          {
            id: 'seg-1',
            text: "The Raspberry Pi was consuming too much power, so let's switch to ESP32.",
            startTimeMs: 15000,
            endTimeMs: 25000,
            speakerLabel: 'Speaker 1',
            confidence: 0.97
          }
        ]
      },
      structuredMemory: {
        id: 'mem-2',
        sessionId: 'session-hardware-2',
        status: 'completed',
        extractedAt: 1700000600000,
        modelUsed: 'local-test',
        summary: {
          oneLiner: "Replaced battery draining chipset with low-power alternative.",
          keyTakeaways: ["ESP32 selected for power savings"]
        },
        people: [{ id: 'p1', name: 'Rahul', mentionCount: 1 }],
        topics: [{ id: 't1', name: 'Hardware redesign' }],
        keyPoints: [],
        questions: [],
        ideas: [],
        commitments: [],
        dates: [],
        events: [],
        facts: [],
        decisions: [{ id: 'd1', decision: 'Switch to ESP32 due to power limits', sourceTimestampMs: 20000 }],
        tasks: [{ id: 'tsk1', task: 'Ship prototype circuit', assignedTo: 'Rahul', completed: false }]
      }
    };

    await databaseService.saveSession(session);
    await memoryVectorIndexService.indexSession(session);

    // Query asking "Why did we change the hardware?"
    const searchResults = await memoryVectorIndexService.search('Why did we change the hardware?', {
      topK: 5,
      minScore: 0.2
    });

    expect(searchResults.length).toBeGreaterThan(0);
    const topMatch = searchResults[0];
    expect(topMatch.record.sessionId).toBe('session-hardware-2');
    expect(topMatch.similarityScore).toBeGreaterThan(0.35);

    // Content should discuss the hardware / power / decision
    const matchedContent = topMatch.record.content.toLowerCase();
    const hasHardwareKeywords = matchedContent.includes('raspberry') ||
                                matchedContent.includes('power') ||
                                matchedContent.includes('hardware') ||
                                matchedContent.includes('esp32');
    expect(hasHardwareKeywords).toBe(true);
  });

  it('supports filtering search by specific unit types (e.g. tasks only or decisions only)', async () => {
    const session: MemorySession = {
      id: 'session-tasks-1',
      title: 'Sprint Planning',
      startTime: 1700000000000,
      endTime: 1700000300000,
      durationMs: 300000,
      audioStorageKey: 'local://idb/audio_blobs/session-tasks-1',
      audioMimeType: 'audio/webm',
      audioSizeBytes: 50000,
      status: 'completed',
      createdAt: 1700000300000,
      updatedAt: 1700000300000,
      structuredMemory: {
        id: 'mem-tasks-plan',
        sessionId: 'session-tasks-1',
        status: 'completed',
        extractedAt: 1700000300000,
        modelUsed: 'local-test',
        people: [],
        topics: [],
        keyPoints: [],
        questions: [],
        ideas: [],
        commitments: [],
        dates: [],
        events: [],
        facts: [],
        summary: {
          oneLiner: 'Sprint commitments and roadmaps for next week.',
          keyTakeaways: ['Sprint roadmap settled']
        },
        decisions: [{ id: 'd1', decision: 'We decided to deploy Friday midnight.' }],
        tasks: [
          { id: 'tsk-a', task: 'Rahul must submit unit tests by Thursday afternoon.', completed: false },
          { id: 'tsk-b', task: 'Prepare deployment changelog for customer release.', completed: false }
        ]
      }
    };

    await databaseService.saveSession(session);
    await memoryVectorIndexService.indexSession(session);

    // Search tasks only
    const taskResults = await memoryVectorIndexService.search('What did Rahul promise to do?', {
      unitTypes: ['task'],
      topK: 3
    });

    expect(taskResults.length).toBeGreaterThan(0);
    for (const r of taskResults) {
      expect(r.record.unitType).toBe('task');
    }

    // Search decisions only
    const decResults = await memoryVectorIndexService.search('When do we deploy?', {
      unitTypes: ['decision'],
      topK: 3
    });

    expect(decResults.length).toBeGreaterThan(0);
    expect(decResults[0].record.unitType).toBe('decision');
    expect(decResults[0].record.content).toContain('Friday midnight');
  });

  it('removes indexed vectors when a session is deleted from DatabaseService', async () => {
    const session: MemorySession = {
      id: 'session-to-delete',
      title: 'Temporary Meeting',
      startTime: 1700000000000,
      endTime: 1700000100000,
      durationMs: 100000,
      audioStorageKey: 'local://idb/audio_blobs/session-to-delete',
      audioMimeType: 'audio/webm',
      audioSizeBytes: 30000,
      status: 'completed',
      createdAt: 1700000100000,
      updatedAt: 1700000100000,
      structuredMemory: {
        id: 'mem-del-1',
        sessionId: 'session-to-delete',
        status: 'completed',
        extractedAt: 1700000100000,
        modelUsed: 'local-test',
        people: [],
        topics: [],
        keyPoints: [],
        questions: [],
        ideas: [],
        decisions: [],
        tasks: [],
        commitments: [],
        dates: [],
        events: [],
        facts: [],
        summary: {
          oneLiner: 'Just a short sync meeting.',
          keyTakeaways: []
        }
      }
    };

    await databaseService.saveSession(session);
    await memoryVectorIndexService.indexSession(session);

    let vectors = await databaseService.getVectorsBySessionId('session-to-delete');
    expect(vectors.length).toBeGreaterThan(0);

    // Delete session
    await databaseService.deleteSession('session-to-delete');

    // Vectors should also be cascade deleted
    vectors = await databaseService.getVectorsBySessionId('session-to-delete');
    expect(vectors.length).toBe(0);
  });
});
