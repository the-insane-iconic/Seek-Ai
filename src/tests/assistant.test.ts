import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { databaseService } from '../services/storage/database';
import { memoryVectorIndexService } from '../services/search/MemoryVectorIndexService';
import { memoryAssistantService } from '../services/assistant/MemoryAssistantService';
import { MemorySession } from '../models/session';

describe('Phase 5: Conversational Memory Assistant & Interactive Citations', () => {
  beforeEach(async () => {
    const sessions = await databaseService.getAllSessions();
    for (const s of sessions) {
      await databaseService.deleteSession(s.id);
    }
    await databaseService.clearAssistantChats();
  });

  afterEach(() => {
    databaseService.close();
  });

  it('answers memory questions with precise interactive source citations', async () => {
    const session: MemorySession = {
      id: 'session-hardware-qa',
      title: 'Hardware Architecture Review',
      startTime: 1700000000000,
      endTime: 1700000600000,
      durationMs: 600000,
      audioStorageKey: 'local://idb/audio_blobs/session-hardware-qa',
      audioMimeType: 'audio/webm',
      audioSizeBytes: 120000,
      status: 'completed',
      createdAt: 1700000600000,
      updatedAt: 1700000600000,
      transcript: {
        id: 'tr-hardware-1',
        fullText: "The Raspberry Pi was consuming too much power, so let's switch to ESP32.",
        language: 'en',
        generatedAt: 1700000600000,
        engine: 'local-test',
        status: 'completed',
        segments: [
          {
            id: 'seg-1',
            text: "The Raspberry Pi was consuming too much power, so let's switch to ESP32.",
            startTimeMs: 24500,
            endTimeMs: 35000,
            speakerLabel: 'Speaker 1',
            confidence: 0.98
          }
        ]
      },
      structuredMemory: {
        id: 'mem-hardware-1',
        sessionId: 'session-hardware-qa',
        status: 'completed',
        extractedAt: 1700000600000,
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
          oneLiner: "Evaluated IoT prototype power draw and chose ESP32.",
          keyTakeaways: ["Raspberry Pi power consumption too high"]
        },
        decisions: [
          {
            id: 'd1',
            decision: "The Raspberry Pi was consuming too much power, so let's switch to ESP32.",
            sourceTimestampMs: 24500
          }
        ],
        tasks: [
          {
            id: 't1',
            task: "Order 5 ESP32 modules for prototyping by Friday.",
            assignedTo: 'Rahul',
            dueDate: 'Friday',
            completed: false
          }
        ]
      }
    };

    await databaseService.saveSession(session);
    await memoryVectorIndexService.indexSession(session);

    // Ask question
    const response = await memoryAssistantService.ask('Why did we change the hardware?');

    expect(response).toBeDefined();
    expect(response.answer).toBeDefined();
    expect(response.answer!.length).toBeGreaterThan(10);

    // Answer should explain the power consumption / raspberry pi / esp32
    const ansLower = response.answer!.toLowerCase();
    expect(ansLower.includes('raspberry') || ansLower.includes('power') || ansLower.includes('esp32')).toBe(true);

    // Verify citations
    expect(response.citations).toBeDefined();
    expect(response.citations!.length).toBeGreaterThan(0);
    const relevantCitation = response.citations!.find(c => c.audioTimestampMs === 24500 || c.unitType === 'decision');
    expect(relevantCitation).toBeDefined();
    expect(relevantCitation?.sessionId).toBe('session-hardware-qa');
    expect(relevantCitation?.sessionTitle).toBe('Hardware Architecture Review');
    expect(relevantCitation?.audioTimestampMs).toBe(24500);
    expect(response.citations![0].relevanceScore).toBeGreaterThan(0.3);
  });

  it('answers task questions citing commitments and owners', async () => {
    const session: MemorySession = {
      id: 'session-tasks-qa',
      title: 'Weekly Standup',
      startTime: 1700000000000,
      endTime: 1700000300000,
      durationMs: 300000,
      audioStorageKey: 'local://idb/audio_blobs/session-tasks-qa',
      audioMimeType: 'audio/webm',
      audioSizeBytes: 50000,
      status: 'completed',
      createdAt: 1700000300000,
      updatedAt: 1700000300000,
      structuredMemory: {
        id: 'mem-tasks-1',
        sessionId: 'session-tasks-qa',
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
          oneLiner: 'Standup covering sprint commitments.',
          keyTakeaways: ['Sprint roadmap settled']
        },
        decisions: [],
        tasks: [
          {
            id: 'tsk-1',
            task: 'Rahul to finish the database migration script before Friday release',
            assignedTo: 'Rahul',
            dueDate: 'Friday',
            completed: false
          }
        ]
      }
    };

    await databaseService.saveSession(session);
    await memoryVectorIndexService.indexSession(session);

    const response = await memoryAssistantService.ask('What tasks did I promise to complete this week?');
    expect(response.answer).toBeDefined();
    expect(response.answer!).toContain('database migration script');
    expect(response.citations).toBeDefined();
    expect(response.citations!.length).toBeGreaterThan(0);
    expect(response.citations![0].unitType).toBe('task');
  });

  it('persists assistant conversation history into IndexedDB and supports clearing', async () => {
    const session: MemorySession = {
      id: 'session-persist-qa',
      title: 'Design Sync',
      startTime: 1700000000000,
      endTime: 1700000100000,
      durationMs: 100000,
      audioStorageKey: 'local://idb/audio_blobs/session-persist-qa',
      audioMimeType: 'audio/webm',
      audioSizeBytes: 20000,
      status: 'completed',
      createdAt: 1700000100000,
      updatedAt: 1700000100000,
      structuredMemory: {
        id: 'mem-persist-1',
        sessionId: 'session-persist-qa',
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
          oneLiner: 'Designed the mobile navigation bar with smooth round corners.',
          keyTakeaways: ['Smooth round corners', 'Obsidian palette']
        }
      }
    };

    await databaseService.saveSession(session);
    await memoryVectorIndexService.indexSession(session);

    // Ask first question
    await memoryAssistantService.ask('What did we design?');

    // Ask second question
    await memoryAssistantService.ask('Tell me about the round corners');

    const history = await memoryAssistantService.getChatHistory();
    // 2 questions + 2 answers = 4 messages
    expect(history.length).toBe(4);
    expect(history[0].role).toBe('user');
    expect(history[1].role).toBe('assistant');
    expect(history[2].role).toBe('user');
    expect(history[3].role).toBe('assistant');

    // Test clearing chat history
    await memoryAssistantService.clearChatHistory();
    const historyAfterClear = await memoryAssistantService.getChatHistory();
    expect(historyAfterClear.length).toBe(0);
  });

  it('gracefully handles queries when no relevant memories exist', async () => {
    // Empty database
    const response = await memoryAssistantService.ask('What did my professor explain about quantum mechanics?');
    expect(response.answer).toBeDefined();
    expect(response.answer!).toContain("I couldn't find any recorded memories or conversations");
    expect(response.citations).toBeDefined();
    expect(response.citations!.length).toBe(0);
  });
});
