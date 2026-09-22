/**
 * Types & Interfaces for Phase 3 Memory Extraction
 */

import { StructuredMemory } from '../../models/session';

export interface ExtractionOptions {
  onProgress?: (status: string, percent?: number, message?: string) => void;
  preferredModel?: string;
}

export interface IMemoryExtractionProvider {
  readonly name: string;
  readonly isLocal: boolean;

  /**
   * Extracts structured memory entities from a session transcript
   */
  extract(
    transcriptText: string, 
    segments: { id: string; startTimeMs: number; endTimeMs: number; text: string; speakerId?: string; speakerLabel?: string }[],
    options?: ExtractionOptions
  ): Promise<Omit<StructuredMemory, 'id' | 'sessionId' | 'status' | 'extractedAt'>>;
}

/**
 * Validates that an extraction result conforms to the required structured schema
 */
export function validateExtractionResult(data: any): boolean {
  if (!data || typeof data !== 'object') return false;

  // Verify arrays exist
  const arrayFields = [
    'people', 'topics', 'keyPoints', 'questions', 'ideas', 
    'decisions', 'tasks', 'commitments', 'dates', 'events', 'facts'
  ];

  for (const field of arrayFields) {
    if (!Array.isArray(data[field])) {
      data[field] = []; // Sanitize missing arrays to empty
    }
  }

  // Ensure summary structure
  if (!data.summary || typeof data.summary !== 'object') {
    data.summary = {
      oneLiner: 'Session recorded and transcribed.',
      keyTakeaways: []
    };
  } else {
    if (typeof data.summary.oneLiner !== 'string') {
      data.summary.oneLiner = String(data.summary.oneLiner || '');
    }
    if (!Array.isArray(data.summary.keyTakeaways)) {
      data.summary.keyTakeaways = [];
    }
  }

  return true;
}
