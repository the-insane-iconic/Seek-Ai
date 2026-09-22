/**
 * MemoryExtractionService — High-level Orchestrator for Phase 3 Memory Extraction
 * 
 * Manages provider selection, schema validation, fallback recovery,
 * and IndexedDB persistence for structured memories.
 */

import { MemorySession, StructuredMemory, ExtractionStatus } from '../../models/session';
import { databaseService } from '../storage/database';
import { IMemoryExtractionProvider, validateExtractionResult } from './types';
import { BackendAIExtractionProvider } from './providers/BackendAIExtractionProvider';
import { LocalSimulatedExtractionProvider } from './providers/LocalSimulatedExtractionProvider';

export class MemoryExtractionService {
  private providers: Map<string, IMemoryExtractionProvider> = new Map();
  private activeProviderName: string = 'backend';

  constructor() {
    this.providers.set('backend', new BackendAIExtractionProvider());
    this.providers.set('local', new LocalSimulatedExtractionProvider());
  }

  public getAvailableProviders(): { id: string; name: string; isLocal: boolean }[] {
    return Array.from(this.providers.entries()).map(([id, p]) => ({
      id,
      name: p.name,
      isLocal: p.isLocal
    }));
  }

  public getActiveProvider(): IMemoryExtractionProvider {
    return this.providers.get(this.activeProviderName) || this.providers.get('local')!;
  }

  public setProvider(providerId: string): void {
    if (this.providers.has(providerId)) {
      this.activeProviderName = providerId;
    }
  }

  /**
   * Main entry point to extract structured memory from a session transcript
   */
  public async extractMemory(
    session: MemorySession,
    options?: {
      providerId?: string;
      onProgress?: (status: ExtractionStatus, percent?: number, message?: string) => void;
    }
  ): Promise<StructuredMemory> {
    const sessionId = session.id;

    if (!session.transcript || !session.transcript.fullText.trim()) {
      throw new Error('Cannot extract memory: session has no transcript.');
    }

    const provider = options?.providerId 
      ? (this.providers.get(options.providerId) || this.getActiveProvider())
      : this.getActiveProvider();

    // Set initial extracting status in session
    const initialMemory: StructuredMemory = session.structuredMemory || {
      id: `mem_${sessionId}`,
      sessionId,
      status: 'extracting',
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
      modelUsed: provider.name
    };

    initialMemory.status = 'extracting';
    await databaseService.updateSessionStructuredMemory(sessionId, initialMemory);
    options?.onProgress?.('extracting', 15, 'Analyzing transcript content...');

    try {
      let rawResult: any;

      try {
        rawResult = await provider.extract(
          session.transcript.fullText,
          session.transcript.segments || [],
          {
            onProgress: (_status, percent, msg) => {
              options?.onProgress?.('extracting', percent, msg);
            }
          }
        );
      } catch (err: any) {
        // Fall back gracefully to local extractor if backend has no key or is unreachable
        if (provider.name.includes('Backend') && (err.code === 'NO_API_KEY' || !navigator.onLine || err.message?.includes('Failed to fetch'))) {
          console.warn('Backend extraction unavailable. Falling back to local on-device intelligence:', err.message);
          options?.onProgress?.('extracting', 35, 'Using local on-device intelligence engine...');
          const localProvider = this.providers.get('local')!;
          rawResult = await localProvider.extract(
            session.transcript.fullText,
            session.transcript.segments || [],
            {
              onProgress: (_status, percent, msg) => {
                options?.onProgress?.('extracting', percent, msg);
              }
            }
          );
        } else {
          throw err;
        }
      }

      // Validate output
      validateExtractionResult(rawResult);

      const completedMemory: StructuredMemory = {
        id: initialMemory.id || `mem_${sessionId}`,
        sessionId,
        status: 'completed',
        summary: rawResult.summary,
        people: rawResult.people,
        topics: rawResult.topics,
        keyPoints: rawResult.keyPoints,
        questions: rawResult.questions,
        ideas: rawResult.ideas,
        decisions: rawResult.decisions,
        tasks: rawResult.tasks,
        commitments: rawResult.commitments,
        dates: rawResult.dates,
        events: rawResult.events,
        facts: rawResult.facts,
        extractedAt: Date.now(),
        modelUsed: rawResult.modelUsed || provider.name,
        isUserEdited: false
      };

      await databaseService.updateSessionStructuredMemory(sessionId, completedMemory);
      options?.onProgress?.('completed', 100, 'Structured memory extracted and saved.');

      return completedMemory;
    } catch (err: any) {
      console.error('Extraction failed for session', sessionId, err);
      const failedMemory: StructuredMemory = {
        ...initialMemory,
        status: 'failed',
        error: err.message || 'Failed to extract structured memory.'
      };
      await databaseService.updateSessionStructuredMemory(sessionId, failedMemory);
      options?.onProgress?.('failed', 0, failedMemory.error);
      throw err;
    }
  }
}

export const memoryExtractionService = new MemoryExtractionService();
