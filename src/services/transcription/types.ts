/**
 * Transcription Service Types & Provider Interface
 */

import { TranscriptData, TranscriptionStatus } from '../../models/session';

export type TranscriptionProgressCallback = (
  status: TranscriptionStatus, 
  progressPercent?: number, 
  message?: string
) => void;

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  onProgress?: TranscriptionProgressCallback;
}

export interface ITranscriptionProvider {
  /**
   * Human-readable identifier for provider
   */
  readonly name: string;

  /**
   * Whether provider runs entirely locally without internet access
   */
  readonly isLocal: boolean;

  /**
   * Transcribes an audio blob into structured transcript data
   */
  transcribe(audioBlob: Blob, options?: TranscriptionOptions): Promise<TranscriptData>;
}

export interface ChunkMetadata {
  index: number;
  totalChunks: number;
  startTimeOffsetMs: number;
  blob: Blob;
}
