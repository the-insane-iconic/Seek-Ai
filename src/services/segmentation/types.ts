/**
 * Conversation Segmentation Provider Interfaces & Types
 */

import { ConversationSegment, TranscriptSegment, ConversationContextType } from '../../models/session';

export interface SegmentationOptions {
  onProgress?: (percent: number, message: string) => void;
  minSegmentDurationMs?: number;
  knownSpeakerNames?: string[];
}

export interface SegmentationResult {
  segments: ConversationSegment[];
  overallContext: ConversationContextType;
  customContext?: string;
}

export interface IConversationSegmentationProvider {
  readonly name: string;
  readonly isLocal: boolean;

  /**
   * Divide a transcribed session into meaningful conversation segments
   */
  segment(
    sessionId: string,
    transcriptSegments: TranscriptSegment[],
    totalDurationMs: number,
    options?: SegmentationOptions
  ): Promise<SegmentationResult>;
}
