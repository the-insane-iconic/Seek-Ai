/**
 * TranscriptionService — High-level Orchestrator for Speech-to-Text
 * 
 * Manages provider lifecycle, status transitions, chunking coordination,
 * fallback recovery, and IndexedDB persistence.
 */

import { MemorySession, TranscriptData } from '../../models/session';
import { databaseService } from '../storage/database';
import { ITranscriptionProvider, TranscriptionProgressCallback } from './types';
import { BackendWhisperProvider } from './providers/BackendWhisperProvider';
import { LocalSimulatedProvider } from './providers/LocalSimulatedProvider';

export class TranscriptionService {
  private providers: Map<string, ITranscriptionProvider> = new Map();
  private activeProviderName: string = 'backend';

  constructor() {
    const backend = new BackendWhisperProvider();
    const local = new LocalSimulatedProvider();

    this.providers.set('backend', backend);
    this.providers.set('local', local);
  }

  public getAvailableProviders(): { id: string; name: string; isLocal: boolean }[] {
    return Array.from(this.providers.entries()).map(([id, p]) => ({
      id,
      name: p.name,
      isLocal: p.isLocal
    }));
  }

  public getActiveProvider(): ITranscriptionProvider {
    return this.providers.get(this.activeProviderName) || this.providers.get('local')!;
  }

  public setProvider(providerId: string): void {
    if (this.providers.has(providerId)) {
      this.activeProviderName = providerId;
    }
  }

  /**
   * Main entry point to transcribe a recorded session
   */
  public async transcribeSession(
    session: MemorySession, 
    options?: {
      providerId?: string;
      onProgress?: TranscriptionProgressCallback;
    }
  ): Promise<TranscriptData> {
    const sessionId = session.id;

    // 1. Fetch original audio blob from IndexedDB
    const audioBlob = await databaseService.getAudioBlob(sessionId);
    if (!audioBlob) {
      const err = new Error('Audio recording not found in local storage.');
      await databaseService.updateTranscriptionStatus(sessionId, 'failed', err.message);
      throw err;
    }

    // 2. Mark session as waiting / processing in database
    await databaseService.updateTranscriptionStatus(sessionId, 'waiting');
    options?.onProgress?.('waiting', 5, 'Queued for processing...');

    const provider = options?.providerId 
      ? (this.providers.get(options.providerId) || this.getActiveProvider())
      : this.getActiveProvider();

    const progressForwarder: TranscriptionProgressCallback = async (status, percent, msg) => {
      options?.onProgress?.(status, percent, msg);
      await databaseService.updateTranscriptionStatus(sessionId, status);
    };

    try {
      options?.onProgress?.('uploading', 15, 'Preparing audio data...');
      
      let transcript: TranscriptData;

      try {
        transcript = await provider.transcribe(audioBlob, {
          onProgress: progressForwarder
        });
      } catch (err: any) {
        // Fallback gracefully to local provider if backend is unconfigured or unreachable
        if (provider.name.includes('Backend') && (err.code === 'NO_API_KEY' || !navigator.onLine || err.message?.includes('Failed to fetch'))) {
          console.warn('Backend provider unavailable. Seamlessly using local on-device provider:', err.message);
          options?.onProgress?.('transcribing', 30, 'Using local on-device transcription engine...');
          const localProvider = this.providers.get('local')!;
          transcript = await localProvider.transcribe(audioBlob, {
            onProgress: progressForwarder
          });
        } else {
          throw err;
        }
      }

      // 3. Store completed transcript with session
      transcript.status = 'completed';
      await databaseService.updateSessionTranscript(sessionId, transcript);
      options?.onProgress?.('completed', 100, 'Transcript generated and saved.');

      return transcript;
    } catch (err: any) {
      console.error('Transcription error for session', sessionId, err);
      const errMsg = err.message || 'Transcription failed';
      await databaseService.updateTranscriptionStatus(sessionId, 'failed', errMsg);
      options?.onProgress?.('failed', 0, errMsg);
      throw err;
    }
  }

  /**
   * Retry failed transcription
   */
  public async retryTranscription(
    session: MemorySession, 
    onProgress?: TranscriptionProgressCallback
  ): Promise<TranscriptData> {
    return this.transcribeSession(session, { onProgress });
  }
}

export const transcriptionService = new TranscriptionService();
