import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { databaseService } from '../services/storage/database';
import { 
  MemorySession, 
  generateUUID, 
  generateDefaultSessionTitle, 
  formatDuration, 
  formatFileSize 
} from '../models/session';

describe('End-to-End Session Workflow & Storage Lifecycle', () => {
  beforeEach(async () => {
    const sessions = await databaseService.getAllSessions();
    for (const s of sessions) {
      await databaseService.deleteSession(s.id);
    }
  });

  afterEach(() => {
    databaseService.close();
  });

  it('completes the entire recording, storage, retrieval, renaming, and purge cycle', async () => {
    // 1. User starts and stops a recording session
    const sessionId = generateUUID();
    const startTime = Date.now() - 45000; // 45 seconds ago
    const endTime = Date.now();
    const durationMs = 45000;
    const defaultTitle = generateDefaultSessionTitle(startTime);

    // Mock recorded audio blob
    const audioBlob = new Blob(['mock audio byte stream opus encoded'], { type: 'audio/webm;codecs=opus' });

    // 2. Persist audio blob in local database
    await databaseService.saveAudioBlob(sessionId, audioBlob);

    // 3. Persist session metadata
    const newSession: MemorySession = {
      id: sessionId,
      title: defaultTitle,
      startTime,
      endTime,
      durationMs,
      audioStorageKey: `local://idb/audio_blobs/${sessionId}`,
      audioMimeType: 'audio/webm;codecs=opus',
      audioSizeBytes: audioBlob.size,
      status: 'completed',
      createdAt: endTime,
      updatedAt: endTime,
    };

    await databaseService.saveSession(newSession);

    // 4. Verify session list and stats
    const allSessions = await databaseService.getAllSessions();
    expect(allSessions.length).toBe(1);
    expect(allSessions[0].id).toBe(sessionId);
    expect(allSessions[0].title).toBe(defaultTitle);
    expect(formatDuration(allSessions[0].durationMs)).toBe('00:45');
    expect(formatFileSize(allSessions[0].audioSizeBytes)).toBe(`${audioBlob.size} B`);

    const stats = await databaseService.getStorageStats();
    expect(stats.sessionCount).toBe(1);
    expect(stats.totalAudioBytes).toBe(audioBlob.size);

    // 5. User renames session
    const updated = await databaseService.updateSessionTitle(sessionId, 'Customer Feedback Call');
    expect(updated.title).toBe('Customer Feedback Call');

    const fetchedAgain = await databaseService.getSession(sessionId);
    expect(fetchedAgain?.title).toBe('Customer Feedback Call');

    // 6. User plays back audio blob
    const fetchedBlob = await databaseService.getAudioBlob(sessionId);
    expect(fetchedBlob).not.toBeNull();
    expect(fetchedBlob?.size).toBe(audioBlob.size);

    // 7. User deletes session
    await databaseService.deleteSession(sessionId);

    const postDeleteSessions = await databaseService.getAllSessions();
    expect(postDeleteSessions.length).toBe(0);

    const postDeleteBlob = await databaseService.getAudioBlob(sessionId);
    expect(postDeleteBlob).toBeNull();

    const postDeleteStats = await databaseService.getStorageStats();
    expect(postDeleteStats.sessionCount).toBe(0);
    expect(postDeleteStats.totalAudioBytes).toBe(0);
  });
});
