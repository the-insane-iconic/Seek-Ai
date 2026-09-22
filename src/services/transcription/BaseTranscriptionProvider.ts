/**
 * BaseTranscriptionProvider — Shared logic for chunking and timestamp reassembly
 */

import { TranscriptData, TranscriptSegment } from '../../models/session';
import { ITranscriptionProvider, TranscriptionOptions, ChunkMetadata } from './types';

export abstract class BaseTranscriptionProvider implements ITranscriptionProvider {
  abstract readonly name: string;
  abstract readonly isLocal: boolean;

  /**
   * Maximum chunk size in bytes (defaults to 15MB to comfortably stay under 25MB limits)
   */
  protected maxChunkSizeBytes: number = 15 * 1024 * 1024;

  /**
   * Subclasses implement the core single-chunk or streaming transcription
   */
  abstract transcribeChunk(
    chunkBlob: Blob, 
    chunkIndex: number, 
    totalChunks: number, 
    options?: TranscriptionOptions
  ): Promise<TranscriptData>;

  /**
   * Processes an audio blob, chunking if necessary and reconciling timestamps
   */
  public async transcribe(audioBlob: Blob, options?: TranscriptionOptions): Promise<TranscriptData> {
    if (audioBlob.size <= this.maxChunkSizeBytes) {
      options?.onProgress?.('transcribing', 20, 'Transcribing audio...');
      const result = await this.transcribeChunk(audioBlob, 0, 1, options);
      options?.onProgress?.('completed', 100, 'Transcription completed.');
      return result;
    }

    // Process long audio in chunks
    const chunks = this.createChunks(audioBlob);
    options?.onProgress?.('uploading', 10, `Processing long recording in ${chunks.length} parts...`);

    const partialResults: TranscriptData[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const percent = Math.round(15 + ((i + 1) / chunks.length) * 75);
      options?.onProgress?.(
        'transcribing', 
        percent, 
        `Transcribing part ${i + 1} of ${chunks.length}...`
      );

      const chunkResult = await this.transcribeChunk(chunk.blob, i, chunks.length, options);
      
      // Reconcile timestamps with chunk offset
      const adjustedSegments = chunkResult.segments.map(seg => ({
        ...seg,
        id: `${seg.id}_c${i}`,
        startTimeMs: seg.startTimeMs + chunk.startTimeOffsetMs,
        endTimeMs: seg.endTimeMs + chunk.startTimeOffsetMs,
        words: seg.words?.map(w => ({
          ...w,
          startTimeMs: w.startTimeMs + chunk.startTimeOffsetMs,
          endTimeMs: w.endTimeMs + chunk.startTimeOffsetMs,
        }))
      }));

      partialResults.push({
        ...chunkResult,
        segments: adjustedSegments
      });
    }

    // Stitch all chunks together
    const stitched = this.stitchTranscriptChunks(partialResults);
    options?.onProgress?.('completed', 100, 'Transcription completed.');
    return stitched;
  }

  /**
   * Splits audio blob into sequential slices with estimated time offsets
   */
  protected createChunks(audioBlob: Blob): ChunkMetadata[] {
    const chunks: ChunkMetadata[] = [];
    const totalBytes = audioBlob.size;
    const numChunks = Math.ceil(totalBytes / this.maxChunkSizeBytes);
    
    // Estimate bytes-per-second (rough baseline for typical compressed audio: 16KB/s for Opus)
    const estimatedTotalDurationMs = 600000; // 10 min fallback
    const msPerByte = estimatedTotalDurationMs / totalBytes;

    for (let i = 0; i < numChunks; i++) {
      const startByte = i * this.maxChunkSizeBytes;
      const endByte = Math.min(startByte + this.maxChunkSizeBytes, totalBytes);
      const slice = audioBlob.slice(startByte, endByte, audioBlob.type);

      chunks.push({
        index: i,
        totalChunks: numChunks,
        startTimeOffsetMs: Math.round(startByte * msPerByte),
        blob: slice
      });
    }

    return chunks;
  }

  /**
   * Combines multiple chunk results into a cohesive TranscriptData object
   */
  protected stitchTranscriptChunks(results: TranscriptData[]): TranscriptData {
    if (results.length === 0) {
      throw new Error('No chunk results to stitch');
    }

    const first = results[0];
    const allSegments: TranscriptSegment[] = [];
    const textPieces: string[] = [];

    for (const res of results) {
      if (res.fullText.trim()) {
        textPieces.push(res.fullText.trim());
      }
      allSegments.push(...res.segments);
    }

    return {
      id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fullText: textPieces.join('\n\n'),
      language: first.language || 'en',
      segments: allSegments,
      generatedAt: Date.now(),
      engine: first.engine,
      status: 'completed'
    };
  }
}
