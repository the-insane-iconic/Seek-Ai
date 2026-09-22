/**
 * BackendAIExtractionProvider — Calls the backend AI proxy endpoint
 * 
 * Communicates with server LLM model (OpenAI GPT-4o / Groq) via /api/extract-memory
 * without exposing secret keys on the mobile client.
 */

import { StructuredMemory } from '../../../models/session';
import { IMemoryExtractionProvider, ExtractionOptions, validateExtractionResult } from '../types';

export class BackendAIExtractionProvider implements IMemoryExtractionProvider {
  readonly name = 'Cloud LLM Extraction (Backend Proxy)';
  readonly isLocal = false;

  private endpointUrl: string;

  constructor(endpointUrl: string = '/api/extract-memory') {
    this.endpointUrl = endpointUrl;
  }

  async extract(
    transcriptText: string, 
    segments: { id: string; startTimeMs: number; endTimeMs: number; text: string }[],
    options?: ExtractionOptions
  ): Promise<Omit<StructuredMemory, 'id' | 'sessionId' | 'status' | 'extractedAt'>> {
    options?.onProgress?.('extracting', 20, 'Sending transcript to AI extractor...');

    const response = await fetch(this.endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcriptText,
        segments,
        preferredModel: options?.preferredModel
      })
    });

    if (!response.ok) {
      let errMessage = `Extraction failed with HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.code === 'NO_API_KEY') {
          const error: any = new Error('No AI API key configured on server');
          error.code = 'NO_API_KEY';
          throw error;
        }
        if (errJson.message) errMessage = errJson.message;
      } catch (e: any) {
        if (e.code === 'NO_API_KEY') throw e;
      }
      throw new Error(errMessage);
    }

    const data = await response.json();
    if (data.code === 'NO_API_KEY') {
      const error: any = new Error('No AI API key configured on server');
      error.code = 'NO_API_KEY';
      throw error;
    }

    validateExtractionResult(data);

    return {
      summary: data.summary,
      people: data.people || [],
      topics: data.topics || [],
      keyPoints: data.keyPoints || [],
      questions: data.questions || [],
      ideas: data.ideas || [],
      decisions: data.decisions || [],
      tasks: data.tasks || [],
      commitments: data.commitments || [],
      dates: data.dates || [],
      events: data.events || [],
      facts: data.facts || [],
      modelUsed: data.modelUsed || 'gpt-4o-backend'
    };
  }
}
