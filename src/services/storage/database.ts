/**
 * DatabaseService — IndexedDB Storage for Memory Sessions
 * 
 * Provides a transactional, schema-versioned data access layer
 * for sessions and binary audio blobs.
 * 
 * Future Phase 2+ migrations can register new object stores
 * (e.g. 'transcripts', 'speakers', 'embeddings') cleanly.
 */

import { 
  MemorySession, 
  TranscriptData, 
  TranscriptionStatus, 
  StructuredMemory,
  SpeakerProfile,
  ConversationSegment,
  ConversationContextType
} from '../../models/session';

const DB_NAME = 'MemoryAppDB';
const DB_VERSION = 2;

export const STORES = {
  SESSIONS: 'sessions',
  AUDIO_BLOBS: 'audio_blobs',
  SPEAKERS: 'speakers',
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

        // Store 3: Speaker Profiles (Phase 4 on-device voice identity cache)
        if (!db.objectStoreNames.contains(STORES.SPEAKERS)) {
          const speakerStore = db.createObjectStore(STORES.SPEAKERS, { keyPath: 'id' });
          speakerStore.createIndex('name', 'name', { unique: false });
          speakerStore.createIndex('isUser', 'isUser', { unique: false });
          speakerStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
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
   * Associate or update complete transcript data for a session
   */
  public async updateSessionTranscript(id: string, transcript: TranscriptData): Promise<MemorySession> {
    const session = await this.getSession(id);
    if (!session) {
      throw new Error(`Session not found with id: ${id}`);
    }

    const updated: MemorySession = {
      ...session,
      transcript,
      updatedAt: Date.now()
    };

    await this.saveSession(updated);
    return updated;
  }

  /**
   * Edit transcript text while preserving original text
   */
  public async updateTranscriptText(id: string, newText: string): Promise<MemorySession> {
    const session = await this.getSession(id);
    if (!session || !session.transcript) {
      throw new Error(`Session or transcript not found for id: ${id}`);
    }

    const currentTranscript = session.transcript;
    const originalText = currentTranscript.originalText || currentTranscript.fullText;

    const updatedTranscript: TranscriptData = {
      ...currentTranscript,
      fullText: newText,
      originalText,
      isEdited: true,
      editedAt: Date.now()
    };

    const updated: MemorySession = {
      ...session,
      transcript: updatedTranscript,
      updatedAt: Date.now()
    };

    await this.saveSession(updated);
    return updated;
  }

  /**
   * Update the transcription processing status
   */
  public async updateTranscriptionStatus(
    id: string, 
    status: TranscriptionStatus, 
    error?: string
  ): Promise<MemorySession> {
    const session = await this.getSession(id);
    if (!session) {
      throw new Error(`Session not found with id: ${id}`);
    }

    const currentTranscript = session.transcript || {
      id: `tr_${id}`,
      fullText: '',
      language: 'en',
      segments: [],
      generatedAt: Date.now(),
      engine: 'whisper',
      status: 'idle'
    };

    const updatedTranscript: TranscriptData = {
      ...currentTranscript,
      status,
      error: error || undefined,
      generatedAt: status === 'completed' ? Date.now() : currentTranscript.generatedAt
    };

    const updated: MemorySession = {
      ...session,
      transcript: updatedTranscript,
      updatedAt: Date.now()
    };

    await this.saveSession(updated);
    return updated;
  }

  /**
   * Associate or update complete structured memory data for a session
   */
  public async updateSessionStructuredMemory(id: string, memory: StructuredMemory): Promise<MemorySession> {
    const session = await this.getSession(id);
    if (!session) {
      throw new Error(`Session not found with id: ${id}`);
    }

    const updated: MemorySession = {
      ...session,
      structuredMemory: memory,
      updatedAt: Date.now()
    };

    await this.saveSession(updated);
    return updated;
  }

  /**
   * Toggle completion state of a specific extracted task
   */
  public async updateMemoryTaskStatus(sessionId: string, taskId: string, completed: boolean): Promise<MemorySession> {
    const session = await this.getSession(sessionId);
    if (!session || !session.structuredMemory) {
      throw new Error(`Session or structured memory not found for id: ${sessionId}`);
    }

    const tasks = session.structuredMemory.tasks.map(t => 
      t.id === taskId ? { ...t, completed, isUserEdited: true } : t
    );

    const updatedMemory: StructuredMemory = {
      ...session.structuredMemory,
      tasks,
      isUserEdited: true
    };

    const updated: MemorySession = {
      ...session,
      structuredMemory: updatedMemory,
      updatedAt: Date.now()
    };

    await this.saveSession(updated);
    return updated;
  }

  /**
   * Update an extracted item in any category (Decision, Topic, Person, etc.)
   */
  public async updateMemoryEntity(
    sessionId: string, 
    category: keyof StructuredMemory, 
    itemId: string, 
    updatedFields: Record<string, any>
  ): Promise<MemorySession> {
    const session = await this.getSession(sessionId);
    if (!session || !session.structuredMemory) {
      throw new Error(`Session or structured memory not found for id: ${sessionId}`);
    }

    const list = (session.structuredMemory as any)[category];
    if (!Array.isArray(list)) {
      throw new Error(`Category ${String(category)} is not an array entity in StructuredMemory`);
    }

    const updatedList = list.map((item: any) => 
      item.id === itemId ? { ...item, ...updatedFields, isUserEdited: true } : item
    );

    const updatedMemory: StructuredMemory = {
      ...session.structuredMemory,
      [category]: updatedList,
      isUserEdited: true
    };

    const updated: MemorySession = {
      ...session,
      structuredMemory: updatedMemory,
      updatedAt: Date.now()
    };

    await this.saveSession(updated);
    return updated;
  }

  /**
   * Delete an extracted item from a category
   */
  public async deleteMemoryEntity(
    sessionId: string, 
    category: keyof StructuredMemory, 
    itemId: string
  ): Promise<MemorySession> {
    const session = await this.getSession(sessionId);
    if (!session || !session.structuredMemory) {
      throw new Error(`Session or structured memory not found for id: ${sessionId}`);
    }

    const list = (session.structuredMemory as any)[category];
    if (!Array.isArray(list)) {
      throw new Error(`Category ${String(category)} is not an array entity in StructuredMemory`);
    }

    const updatedList = list.filter((item: any) => item.id !== itemId);

    const updatedMemory: StructuredMemory = {
      ...session.structuredMemory,
      [category]: updatedList,
      isUserEdited: true
    };

    const updated: MemorySession = {
      ...session,
      structuredMemory: updatedMemory,
      updatedAt: Date.now()
    };

    await this.saveSession(updated);
    return updated;
  }

  /**
   * Add a user-created entity to a category
   */
  public async addMemoryEntity(
    sessionId: string, 
    category: keyof StructuredMemory, 
    item: Record<string, any>
  ): Promise<MemorySession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found with id: ${sessionId}`);
    }

    const memory: StructuredMemory = session.structuredMemory || {
      id: `mem_${sessionId}`,
      sessionId,
      status: 'completed',
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
      extractedAt: Date.now(),
      modelUsed: 'user-created',
      isUserEdited: true
    };

    const list = (memory as any)[category] || [];
    const newItem = {
      ...item,
      id: item.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isUserCreated: true
    };

    const updatedMemory: StructuredMemory = {
      ...memory,
      [category]: [...list, newItem],
      isUserEdited: true
    };

    const updated: MemorySession = {
      ...session,
      structuredMemory: updatedMemory,
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

  // =========================================================================
  // Phase 4: Speaker Profile & Voice Identity Management (On-Device Store)
  // =========================================================================

  /**
   * Save or update a global reusable speaker profile
   */
  public async saveSpeakerProfile(profile: SpeakerProfile): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SPEAKERS, 'readwrite');
      const store = tx.objectStore(STORES.SPEAKERS);
      const req = store.put(profile);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error(`Failed to save speaker profile: ${req.error?.message}`));
    });
  }

  /**
   * Get all registered speaker profiles
   */
  public async getAllSpeakerProfiles(): Promise<SpeakerProfile[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SPEAKERS, 'readonly');
      const store = tx.objectStore(STORES.SPEAKERS);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(new Error(`Failed to get speaker profiles: ${req.error?.message}`));
    });
  }

  /**
   * Get a speaker profile by ID
   */
  public async getSpeakerProfile(id: string): Promise<SpeakerProfile | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SPEAKERS, 'readonly');
      const store = tx.objectStore(STORES.SPEAKERS);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(new Error(`Failed to get speaker profile: ${req.error?.message}`));
    });
  }

  /**
   * Permanently delete a speaker profile for user privacy
   */
  public async deleteSpeakerProfile(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SPEAKERS, 'readwrite');
      const store = tx.objectStore(STORES.SPEAKERS);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error(`Failed to delete speaker profile: ${req.error?.message}`));
    });
  }

  /**
   * Clear all speaker profiles (privacy wipe)
   */
  public async clearAllSpeakerProfiles(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SPEAKERS, 'readwrite');
      const store = tx.objectStore(STORES.SPEAKERS);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error(`Failed to clear speaker profiles: ${req.error?.message}`));
    });
  }

  // =========================================================================
  // Phase 4: Conversation Segments & Context Mutations
  // =========================================================================

  /**
   * Update conversation segments on a session
   */
  public async updateSessionSegments(sessionId: string, segments: ConversationSegment[]): Promise<MemorySession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found with id: ${sessionId}`);
    }

    const updated: MemorySession = {
      ...session,
      conversationSegments: segments,
      updatedAt: Date.now()
    };

    await this.saveSession(updated);
    return updated;
  }

  /**
   * Split a conversation segment into two at splitTimeMs
   */
  public async splitConversationSegment(
    sessionId: string, 
    segmentId: string, 
    splitTimeMs: number, 
    newTitle?: string
  ): Promise<MemorySession> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const existingSegments = session.conversationSegments || [];
    const targetIdx = existingSegments.findIndex(s => s.id === segmentId);
    if (targetIdx === -1) throw new Error(`Segment not found: ${segmentId}`);

    const original = existingSegments[targetIdx];
    if (splitTimeMs <= original.startTimeMs || splitTimeMs >= original.endTimeMs) {
      throw new Error(`Split timestamp ${splitTimeMs} must be strictly between ${original.startTimeMs} and ${original.endTimeMs}`);
    }

    const firstSegment: ConversationSegment = {
      ...original,
      endTimeMs: splitTimeMs,
      isUserEdited: true
    };

    const secondSegment: ConversationSegment = {
      id: `cseg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId,
      title: newTitle || `${original.title} (Part 2)`,
      contextType: original.contextType,
      customContext: original.customContext,
      startTimeMs: splitTimeMs,
      endTimeMs: original.endTimeMs,
      speakerIds: [...original.speakerIds],
      isUserEdited: true
    };

    const newSegments = [...existingSegments];
    newSegments.splice(targetIdx, 1, firstSegment, secondSegment);

    // Re-link transcript segments to the appropriate conversationSegmentId
    let updatedTranscript = session.transcript;
    if (updatedTranscript && updatedTranscript.segments) {
      const updatedUtterances = updatedTranscript.segments.map(u => {
        if (u.startTimeMs >= splitTimeMs && u.startTimeMs < secondSegment.endTimeMs) {
          return { ...u, conversationSegmentId: secondSegment.id };
        }
        return u;
      });
      updatedTranscript = { ...updatedTranscript, segments: updatedUtterances };
    }

    const updated: MemorySession = {
      ...session,
      conversationSegments: newSegments,
      transcript: updatedTranscript,
      updatedAt: Date.now()
    };

    await this.saveSession(updated);
    return updated;
  }

  /**
   * Merge two adjacent conversation segments
   */
  public async mergeConversationSegments(
    sessionId: string, 
    segmentId1: string, 
    segmentId2: string
  ): Promise<MemorySession> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const existingSegments = session.conversationSegments || [];
    const idx1 = existingSegments.findIndex(s => s.id === segmentId1);
    const idx2 = existingSegments.findIndex(s => s.id === segmentId2);

    if (idx1 === -1 || idx2 === -1) {
      throw new Error('Could not find both conversation segments to merge');
    }

    const s1 = existingSegments[Math.min(idx1, idx2)];
    const s2 = existingSegments[Math.max(idx1, idx2)];

    const mergedSpeakers = Array.from(new Set([...s1.speakerIds, ...s2.speakerIds]));

    const mergedSegment: ConversationSegment = {
      id: s1.id,
      sessionId,
      title: `${s1.title} & ${s2.title}`,
      contextType: s1.contextType,
      customContext: s1.customContext,
      startTimeMs: Math.min(s1.startTimeMs, s2.startTimeMs),
      endTimeMs: Math.max(s1.endTimeMs, s2.endTimeMs),
      speakerIds: mergedSpeakers,
      summary: [s1.summary, s2.summary].filter(Boolean).join(' '),
      isUserEdited: true
    };

    const remainingSegments = existingSegments.filter(s => s.id !== s1.id && s.id !== s2.id);
    remainingSegments.splice(Math.min(idx1, idx2), 0, mergedSegment);
    remainingSegments.sort((a, b) => a.startTimeMs - b.startTimeMs);

    // Re-link transcript segments
    let updatedTranscript = session.transcript;
    if (updatedTranscript && updatedTranscript.segments) {
      const updatedUtterances = updatedTranscript.segments.map(u => {
        if (u.conversationSegmentId === s2.id) {
          return { ...u, conversationSegmentId: s1.id };
        }
        return u;
      });
      updatedTranscript = { ...updatedTranscript, segments: updatedUtterances };
    }

    const updated: MemorySession = {
      ...session,
      conversationSegments: remainingSegments,
      transcript: updatedTranscript,
      updatedAt: Date.now()
    };

    await this.saveSession(updated);
    return updated;
  }

  /**
   * Update session speakers and sync with transcript segments
   */
  public async updateSessionSpeakers(sessionId: string, speakers: SpeakerProfile[]): Promise<MemorySession> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const updated: MemorySession = {
      ...session,
      speakers,
      updatedAt: Date.now()
    };

    await this.saveSession(updated);
    return updated;
  }

  /**
   * Identify or rename a speaker (e.g. Speaker 1 -> Rahul, or tag as You)
   */
  public async renameSpeaker(
    sessionId: string, 
    speakerId: string, 
    newName: string, 
    isUser?: boolean
  ): Promise<MemorySession> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const speakers = (session.speakers || []).map(sp => {
      if (sp.id === speakerId) {
        return {
          ...sp,
          name: newName,
          isUser: isUser !== undefined ? isUser : sp.isUser,
          confidence: 1.0, // User verified
          updatedAt: Date.now()
        };
      }
      // If setting this speaker as user, ensure other speakers are not isUser
      if (isUser && sp.isUser && sp.id !== speakerId) {
        return { ...sp, isUser: false, updatedAt: Date.now() };
      }
      return sp;
    });

    const targetSpeaker = speakers.find(s => s.id === speakerId);
    const displayName = targetSpeaker?.isUser ? 'You' : (targetSpeaker?.name || newName);

    // Update transcript segment labels
    let updatedTranscript = session.transcript;
    if (updatedTranscript && updatedTranscript.segments) {
      const updatedSegments = updatedTranscript.segments.map(seg => {
        if (seg.speakerId === speakerId) {
          return {
            ...seg,
            speakerLabel: displayName
          };
        }
        return seg;
      });
      updatedTranscript = { ...updatedTranscript, segments: updatedSegments };
    }

    // Also persist or update in global speaker profiles store for future recognition
    if (targetSpeaker) {
      await this.saveSpeakerProfile({
        ...targetSpeaker,
        associatedSessionCount: (targetSpeaker.associatedSessionCount || 1)
      });
    }

    const updated: MemorySession = {
      ...session,
      speakers,
      transcript: updatedTranscript,
      updatedAt: Date.now()
    };

    await this.saveSession(updated);
    return updated;
  }

  /**
   * Update session conversation context (Lecture, Meeting, Project discussion, etc.)
   */
  public async updateSessionContext(
    sessionId: string, 
    contextType: ConversationContextType, 
    customContext?: string, 
    newTitle?: string
  ): Promise<MemorySession> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const updated: MemorySession = {
      ...session,
      title: newTitle || session.title,
      contextType,
      customContext,
      updatedAt: Date.now()
    };

    await this.saveSession(updated);
    return updated;
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
