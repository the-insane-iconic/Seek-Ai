import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { databaseService } from '../services/storage/database';
import { MemorySession } from '../models/session';

describe('DatabaseService (IndexedDB)', () => {
  beforeEach(async () => {
    // Clean state
    const sessions = await databaseService.getAllSessions();
    for (const s of sessions) {
      await databaseService.deleteSession(s.id);
    }
  });

  afterEach(() => {
    databaseService.close();
  });

  it('saves, retrieves, and lists memory sessions', async () => {
    const session: MemorySession = {
      id: 'test-session-1',
      title: 'Morning Brainstorm',
      startTime: 1700000000000,
      endTime: 1700000060000,
      durationMs: 60000,
      audioStorageKey: 'local://idb/audio_blobs/test-session-1',
      audioMimeType: 'audio/webm',
      audioSizeBytes: 45000,
      status: 'completed',
      createdAt: 1700000060000,
      updatedAt: 1700000060000,
    };

    await databaseService.saveSession(session);

    const fetched = await databaseService.getSession('test-session-1');
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe('Morning Brainstorm');
    expect(fetched?.durationMs).toBe(60000);

    const all = await databaseService.getAllSessions();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe('test-session-1');
  });

  it('renames a session title successfully', async () => {
    const session: MemorySession = {
      id: 'test-session-2',
      title: 'Initial Title',
      startTime: 1700000000000,
      endTime: 1700000030000,
      durationMs: 30000,
      audioStorageKey: 'local://idb/audio_blobs/test-session-2',
      audioMimeType: 'audio/webm',
      audioSizeBytes: 20000,
      status: 'completed',
      createdAt: 1700000030000,
      updatedAt: 1700000030000,
    };

    await databaseService.saveSession(session);
    const updated = await databaseService.updateSessionTitle('test-session-2', 'Renamed Meeting Notes');
    expect(updated.title).toBe('Renamed Meeting Notes');

    const fetched = await databaseService.getSession('test-session-2');
    expect(fetched?.title).toBe('Renamed Meeting Notes');
  });

  it('deletes session and associated audio data cleanly', async () => {
    const sessionId = 'test-session-3';
    const session: MemorySession = {
      id: sessionId,
      title: 'To Be Deleted',
      startTime: 1700000000000,
      endTime: 1700000010000,
      durationMs: 10000,
      audioStorageKey: `local://idb/audio_blobs/${sessionId}`,
      audioMimeType: 'audio/webm',
      audioSizeBytes: 15000,
      status: 'completed',
      createdAt: 1700000010000,
      updatedAt: 1700000010000,
    };

    // Store session and dummy audio blob
    await databaseService.saveSession(session);
    const dummyBlob = new Blob(['mock audio binary data'], { type: 'audio/webm' });
    await databaseService.saveAudioBlob(sessionId, dummyBlob);

    // Verify presence
    expect(await databaseService.getSession(sessionId)).not.toBeNull();
    expect(await databaseService.getAudioBlob(sessionId)).not.toBeNull();

    // Delete
    await databaseService.deleteSession(sessionId);

    // Verify clean deletion
    expect(await databaseService.getSession(sessionId)).toBeNull();
    expect(await databaseService.getAudioBlob(sessionId)).toBeNull();
  });
});
