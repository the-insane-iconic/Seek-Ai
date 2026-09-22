/**
 * BackendAISegmentationProvider — Cloud LLM Assisted Conversation Boundary Detection
 * 
 * Invokes backend proxy /api/segment-conversation if available,
 * or signals NO_API_KEY for graceful local engine fallback.
 */

import { TranscriptSegment } from '../../../models/session';
import { IConversationSegmentationProvider, SegmentationOptions, SegmentationResult } from '../types';

export class BackendAISegmentationProvider implements IConversationSegmentationProvider {
  readonly name = 'AI Cloud Segmentation (OpenAI / Groq)';
  readonly isLocal = false;

  public async segment(
    sessionId: string,
    transcriptSegments: TranscriptSegment[],
    totalDurationMs: number,
    options?: SegmentationOptions
  ): Promise<SegmentationResult> {
    options?.onProgress?.(25, 'Requesting AI conversation segmentation...');

    const response = await fetch('/api/segment-conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        segments: transcriptSegments,
        totalDurationMs
      })
    });

    if (!response.ok) {
      throw new Error(`Segmentation server error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code === 'NO_API_KEY') {
      const err = new Error(data.message);
      (err as any).code = 'NO_API_KEY';
      throw err;
    }

    options?.onProgress?.(100, 'AI segmentation complete.');
    return data;
  }
}
