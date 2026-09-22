/**
 * ConversationSegmentationService — High-level Orchestrator for Phase 4 Segmentation
 * 
 * Manages conversation boundary detection, fallback handling,
 * and persistence in IndexedDB.
 */

import { MemorySession } from '../../models/session';
import { databaseService } from '../storage/database';
import { IConversationSegmentationProvider, SegmentationOptions, SegmentationResult } from './types';
import { LocalConversationSegmentationProvider } from './providers/LocalConversationSegmentationProvider';
import { BackendAISegmentationProvider } from './providers/BackendAISegmentationProvider';

export class ConversationSegmentationService {
  private providers: Map<string, IConversationSegmentationProvider> = new Map();
  private activeProviderId = 'local';

  constructor() {
    this.providers.set('local', new LocalConversationSegmentationProvider());
    this.providers.set('backend', new BackendAISegmentationProvider());
  }

  private static instance: ConversationSegmentationService;

  public static getInstance(): ConversationSegmentationService {
    if (!ConversationSegmentationService.instance) {
      ConversationSegmentationService.instance = new ConversationSegmentationService();
    }
    return ConversationSegmentationService.instance;
  }

  public getActiveProvider(): IConversationSegmentationProvider {
    return this.providers.get(this.activeProviderId) || this.providers.get('local')!;
  }

  public setProvider(providerId: string): void {
    if (this.providers.has(providerId)) {
      this.activeProviderId = providerId;
    }
  }

  /**
   * Segment a session by ID and persist to IndexedDB
   */
  public async segmentSession(
    sessionId: string,
    options?: SegmentationOptions
  ): Promise<MemorySession> {
    const session = await databaseService.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found with id: ${sessionId}`);
    }
    return this.segmentAndPersist(session, options);
  }

  /**
   * Automatically segment a session into conversations and persist to IndexedDB
   */
  public async segmentAndPersist(
    session: MemorySession,
    options?: SegmentationOptions
  ): Promise<MemorySession> {
    const transcript = session.transcript;
    if (!transcript || !transcript.segments || transcript.segments.length === 0) {
      // Nothing to segment yet
      return session;
    }

    const provider = this.getActiveProvider();
    let result: SegmentationResult;

    try {
      result = await provider.segment(
        session.id, 
        transcript.segments, 
        session.durationMs, 
        options
      );
    } catch (err: any) {
      if (err.code === 'NO_API_KEY' || !navigator.onLine || err.message?.includes('Failed to fetch')) {
        console.warn('Backend segmentation unavailable. Falling back to local segmentation:', err.message);
        const localProvider = this.providers.get('local')!;
        result = await localProvider.segment(
          session.id, 
          transcript.segments, 
          session.durationMs, 
          options
        );
      } else {
        throw err;
      }
    }

    // Update session in IndexedDB
    const updated: MemorySession = {
      ...session,
      conversationSegments: result.segments,
      contextType: session.contextType || result.overallContext,
      customContext: session.customContext || result.customContext,
      transcript: {
        ...transcript,
        segments: transcript.segments // segments may have updated conversationSegmentId
      },
      updatedAt: Date.now()
    };

    await databaseService.saveSession(updated);
    return updated;
  }
}

export const conversationSegmentationService = new ConversationSegmentationService();
