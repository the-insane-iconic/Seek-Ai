/**
 * BackendAIDiarizationProvider — Cloud LLM Assisted Speaker Turn Diarization
 */

import { TranscriptSegment } from '../../../models/session';
import { ISpeakerDiarizationProvider, DiarizationOptions, DiarizationResult } from '../types';

export class BackendAIDiarizationProvider implements ISpeakerDiarizationProvider {
  readonly name = 'AI Cloud Diarization';
  readonly isLocal = false;

  public async diarize(
    sessionId: string,
    transcriptSegments: TranscriptSegment[],
    audioDurationMs: number,
    options?: DiarizationOptions
  ): Promise<DiarizationResult> {
    options?.onProgress?.(30, 'Requesting AI speaker turn diarization...');

    const response = await fetch('/api/diarize-speakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        segments: transcriptSegments,
        audioDurationMs
      })
    });

    if (!response.ok) {
      throw new Error(`Diarization server error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code === 'NO_API_KEY') {
      const err = new Error(data.message);
      (err as any).code = 'NO_API_KEY';
      throw err;
    }

    options?.onProgress?.(100, 'AI speaker diarization complete.');
    return data;
  }
}
