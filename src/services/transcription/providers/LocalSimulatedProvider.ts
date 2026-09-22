/**
 * LocalSimulatedProvider — Reliable on-device simulation provider
 * 
 * Generates realistic timestamped conversational transcripts
 * without requiring external network connectivity or API tokens.
 * Ideal for offline usage, testing, and fallback.
 */

import { TranscriptData, TranscriptSegment } from '../../../models/session';
import { BaseTranscriptionProvider } from '../BaseTranscriptionProvider';
import { TranscriptionOptions } from '../types';

export class LocalSimulatedProvider extends BaseTranscriptionProvider {
  readonly name = 'Local On-Device Engine (Simulated)';
  readonly isLocal = true;

  private samplePhrases: string[] = [
    "Welcome to this memory session. Let's make sure we capture all key decisions and observations clearly.",
    "First, we reviewed the system architecture and agreed that keeping client-side storage modular is essential.",
    "Next, we discussed speech-to-text processing, emphasizing that audio must never be sent without explicit user permission.",
    "Timestamp synchronization between the audio playback and transcript will allow jumping directly to any spoken moment.",
    "Finally, all future AI capabilities like semantic search and summaries will build cleanly on top of this verified foundation."
  ];

  async transcribeChunk(
    chunkBlob: Blob, 
    _chunkIndex: number, 
    _totalChunks: number, 
    options?: TranscriptionOptions
  ): Promise<TranscriptData> {
    options?.onProgress?.('uploading', 20, 'Preparing audio for local processing...');
    await new Promise(r => setTimeout(r, 400));

    options?.onProgress?.('transcribing', 45, 'Analyzing acoustic frequencies...');
    await new Promise(r => setTimeout(r, 600));

    options?.onProgress?.('transcribing', 80, 'Generating timestamped word utterances...');
    await new Promise(r => setTimeout(r, 500));

    // Approximate duration from chunk byte size (rough baseline: ~16KB/sec for Opus audio)
    const estimatedDurationMs = Math.max(8000, Math.min(180000, Math.round((chunkBlob.size / 16000) * 1000)));

    const numSegments = Math.max(2, Math.min(this.samplePhrases.length, Math.floor(estimatedDurationMs / 6000)));
    const segmentDuration = Math.floor(estimatedDurationMs / numSegments);

    const segments: TranscriptSegment[] = [];

    for (let i = 0; i < numSegments; i++) {
      const startTimeMs = i * segmentDuration;
      const endTimeMs = Math.min(estimatedDurationMs, (i + 1) * segmentDuration);
      const text = this.samplePhrases[i % this.samplePhrases.length];

      // Word-level timestamps
      const words = text.split(' ');
      const wordDuration = (endTimeMs - startTimeMs) / words.length;
      const wordItems = words.map((w, wIdx) => ({
        word: w,
        startTimeMs: Math.round(startTimeMs + wIdx * wordDuration),
        endTimeMs: Math.round(startTimeMs + (wIdx + 1) * wordDuration),
        confidence: 0.94 + Math.random() * 0.05
      }));

      segments.push({
        id: `seg_sim_${i}_${Date.now()}`,
        startTimeMs,
        endTimeMs,
        text,
        words: wordItems
      });
    }

    const fullText = segments.map(s => s.text).join('\n\n');

    return {
      id: `tr_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fullText,
      language: options?.language || 'en',
      segments,
      generatedAt: Date.now(),
      engine: 'local-onnx-simulated',
      status: 'completed'
    };
  }
}
