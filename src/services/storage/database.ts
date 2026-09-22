/**
 * DatabaseService — IndexedDB Storage for Memory Sessions
 * 
 * Provides a transactional, schema-versioned data access layer
 * for sessions and binary audio blobs.
 * 
 * Future Phase 2+ migrations can register new object stores
 * (e.g. 'transcripts', 'speakers', 'embeddings') cleanly.
 */

import { MemorySession } from '../../models/session';

const DB_NAME = 'MemoryAppDB';
const DB_VERSION = 1;

export const STORES = {
  SESSIONS: 'sessions',
  AUDIO_BLOBS: 'audio_blobs',
} as const;

export interface AudioBlobRecord {
  id: string; // matches session.id or audioStorageKey
  blob: Blob;
  mimeType: string;
  sizeBytes: number;
  createdAt: number;
}

class DatabaseService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initializes or returns existing IndexedDB connection
   */
  public async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store 1: Sessions metadata
        if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
          const sessionStore = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
          sessionStore.createIndex('startTime', 'startTime', { unique: false });
          sessionStore.createIndex('createdAt', 'createdAt', { unique: false });
          sessionStore.createIndex('status', 'status', { unique: false });
        }

        // Store 2: Audio blobs (stored locally on-device)
        if (!db.objectStoreNames.contains(STORES.AUDIO_BLOBS)) {
          db.createObjectStore(STORES.AUDIO_BLOBS, { keyPath: 'id' });
        }

        // Future stores for Phase 2:
        // 'transcripts', 'speakers', 'structured_memories', 'vector_embeddings'
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onblocked = () => {
        console.warn('Database upgrade blocked by open tabs.');
      };
    });

    return this.dbPromise;
  }

  /**
   * Insert or update a MemorySession record
   */
  public async saveSession(session: MemorySession): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SESSIONS, 'readwrite');
      const store = tx.objectStore(STORES.SESSIONS);
      const req = store.put(session);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error(`Failed to save session: ${req.error?.message}`));
    });
  }

  /**
   * Fetch a single session by ID
   */
  public async getSession(id: string): Promise<MemorySession | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SESSIONS, 'readonly');
      const store = tx.objectStore(STORES.SESSIONS);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(new Error(`Failed to get session: ${req.error?.message}`));
    });
  }

  /**
   * Fetch all sessions, sorted by startTime descending (newest first)
   */
  public async getAllSessions(): Promise<MemorySession[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SESSIONS, 'readonly');
      const store = tx.objectStore(STORES.SESSIONS);
      const req = store.getAll();

      req.onsuccess = () => {
        const sessions: MemorySession[] = req.result || [];
        // Sort newest first
        sessions.sort((a, b) => b.startTime - a.startTime);
        resolve(sessions);
      };
      req.onerror = () => reject(new Error(`Failed to get all sessions: ${req.error?.message}`));
    });
  }

  /**
   * Update the user-defined title of a session
   */
  public async updateSessionTitle(id: string, newTitle: string): Promise<MemorySession> {
    const session = await this.getSession(id);
    if (!session) {
      throw new Error(`Session not found with id: ${id}`);
    }

    const updated: MemorySession = {
      ...session,
      title: newTitle.trim() || session.title,
      updatedAt: Date.now()
    };

    await this.saveSession(updated);
    return updated;
  }

  /**
   * Delete a session and its associated audio blob permanently
   */
  public async deleteSession(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.SESSIONS, STORES.AUDIO_BLOBS], 'readwrite');
      const sessionStore = tx.objectStore(STORES.SESSIONS);
      const audioStore = tx.objectStore(STORES.AUDIO_BLOBS);

      sessionStore.delete(id);
      audioStore.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error(`Failed to delete session and audio: ${tx.error?.message}`));
      tx.onabort = () => reject(new Error(`Transaction aborted during session delete: ${tx.error?.message}`));
    });
  }

  /**
   * Save an audio blob locally in IndexedDB
   */
  public async saveAudioBlob(id: string, blob: Blob): Promise<void> {
    const db = await this.getDB();
    const record: AudioBlobRecord = {
      id,
      blob,
      mimeType: blob.type || 'audio/webm',
      sizeBytes: blob.size,
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.AUDIO_BLOBS, 'readwrite');
      const store = tx.objectStore(STORES.AUDIO_BLOBS);
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error(`Failed to save audio blob: ${req.error?.message}`));
    });
  }

  /**
   * Retrieve audio blob by session ID
   */
  public async getAudioBlob(id: string): Promise<Blob | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.AUDIO_BLOBS, 'readonly');
      const store = tx.objectStore(STORES.AUDIO_BLOBS);
      const req = store.get(id);

      req.onsuccess = () => {
        const record = req.result as AudioBlobRecord | undefined;
        resolve(record ? record.blob : null);
      };
      req.onerror = () => reject(new Error(`Failed to get audio blob: ${req.error?.message}`));
    });
  }

  /**
   * Delete only the audio blob
   */
  public async deleteAudioBlob(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.AUDIO_BLOBS, 'readwrite');
      const store = tx.objectStore(STORES.AUDIO_BLOBS);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error(`Failed to delete audio blob: ${req.error?.message}`));
    });
  }

  /**
   * Compute aggregated storage statistics
   */
  public async getStorageStats(): Promise<{ sessionCount: number; totalAudioBytes: number }> {
    const sessions = await this.getAllSessions();
    const totalBytes = sessions.reduce((sum, s) => sum + (s.audioSizeBytes || 0), 0);
    return {
      sessionCount: sessions.length,
      totalAudioBytes: totalBytes
    };
  }

  /**
   * Close the database connection (for tests or teardown)
   */
  public close(): void {
    if (this.dbPromise) {
      this.dbPromise.then(db => db.close());
      this.dbPromise = null;
    }
  }
}

export const databaseService = new DatabaseService();
