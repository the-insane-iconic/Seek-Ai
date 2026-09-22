/**
 * Speaker Diarization Provider Interfaces & Types
 */

import { SpeakerProfile, TranscriptSegment } from '../../models/session';

export interface DiarizationOptions {
  onProgress?: (percent: number, message: string) => void;
  knownProfiles?: SpeakerProfile[];
  expectedSpeakerCount?: number;
}

export interface DiarizationResult {
  speakers: SpeakerProfile[];
  attributedSegments: TranscriptSegment[];
}

export interface ISpeakerDiarizationProvider {
  readonly name: string;
  readonly isLocal: boolean;

  /**
   * Perform speaker diarization and turn attribution on transcript segments
   */
  diarize(
    sessionId: string,
    transcriptSegments: TranscriptSegment[],
    audioDurationMs: number,
    options?: DiarizationOptions
  ): Promise<DiarizationResult>;
}
