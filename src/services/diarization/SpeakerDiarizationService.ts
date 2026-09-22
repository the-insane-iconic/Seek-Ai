/**
 * SpeakerDiarizationService — High-level Orchestrator for Phase 4 Speaker Diarization
 */

import { MemorySession } from '../../models/session';
import { databaseService } from '../storage/database';
import { ISpeakerDiarizationProvider, DiarizationOptions, DiarizationResult } from './types';
import { LocalSpeakerDiarizationProvider } from './providers/LocalSpeakerDiarizationProvider';
import { BackendAIDiarizationProvider } from './providers/BackendAIDiarizationProvider';

export class SpeakerDiarizationService {
  private providers: Map<string, ISpeakerDiarizationProvider> = new Map();
  private activeProviderId = 'local';

  constructor() {
    this.providers.set('local', new LocalSpeakerDiarizationProvider());
    this.providers.set('backend', new BackendAIDiarizationProvider());
  }

  private static instance: SpeakerDiarizationService;

  public static getInstance(): SpeakerDiarizationService {
    if (!SpeakerDiarizationService.instance) {
      SpeakerDiarizationService.instance = new SpeakerDiarizationService();
    }
    return SpeakerDiarizationService.instance;
  }

  public getActiveProvider(): ISpeakerDiarizationProvider {
    return this.providers.get(this.activeProviderId) || this.providers.get('local')!;
  }

  public setProvider(providerId: string): void {
    if (this.providers.has(providerId)) {
      this.activeProviderId = providerId;
    }
  }

  /**
   * Diarize a session by ID and persist
   */
  public async diarizeSession(
    sessionId: string,
    options?: DiarizationOptions
  ): Promise<MemorySession> {
    const session = await databaseService.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found with id: ${sessionId}`);
    }
    return this.diarizeAndPersist(session, options);
  }

  /**
   * Diarize a transcribed session, attribute speakers to utterances, and persist
   */
  public async diarizeAndPersist(
    session: MemorySession,
    options?: DiarizationOptions
  ): Promise<MemorySession> {
    const transcript = session.transcript;
    if (!transcript || !transcript.segments || transcript.segments.length === 0) {
      return session;
    }

    // Load known speaker profiles from IndexedDB to correlate
    const knownProfiles = await databaseService.getAllSpeakerProfiles();

    const provider = this.getActiveProvider();
    let result: DiarizationResult;

    try {
      result = await provider.diarize(
        session.id,
        transcript.segments,
        session.durationMs,
        {
          ...options,
          knownProfiles
        }
      );
    } catch (err: any) {
      if (err.code === 'NO_API_KEY' || !navigator.onLine || err.message?.includes('Failed to fetch')) {
        console.warn('Backend diarization unavailable. Falling back to local diarization:', err.message);
        const localProvider = this.providers.get('local')!;
        result = await localProvider.diarize(
          session.id,
          transcript.segments,
          session.durationMs,
          {
            ...options,
            knownProfiles
          }
        );
      } else {
        throw err;
      }
    }

    // Save known speakers into on-device store for future recognition
    for (const sp of result.speakers) {
      if (sp.name || sp.isUser) {
        await databaseService.saveSpeakerProfile(sp);
      }
    }

    // Update conversation segments to include active speaker IDs if segments already exist
    let updatedSegments = session.conversationSegments;
    if (updatedSegments && updatedSegments.length > 0) {
      updatedSegments = updatedSegments.map(cSeg => {
        const segSpeakers = new Set<string>();
        result.attributedSegments.forEach(u => {
          if (u.startTimeMs >= cSeg.startTimeMs && u.startTimeMs <= cSeg.endTimeMs && u.speakerId) {
            segSpeakers.add(u.speakerId);
          }
        });
        return {
          ...cSeg,
          speakerIds: Array.from(segSpeakers)
        };
      });
    }

    const updated: MemorySession = {
      ...session,
      speakers: result.speakers,
      conversationSegments: updatedSegments,
      transcript: {
        ...transcript,
        segments: result.attributedSegments
      },
      updatedAt: Date.now()
    };

    await databaseService.saveSession(updated);
    return updated;
  }
}

export const speakerDiarizationService = new SpeakerDiarizationService();
