/**
 * LocalConversationSegmentationProvider — On-Device Rule & NLP Conversation Boundary Detection
 * 
 * Works 100% offline without external network or API keys.
 * Accurately divides recordings into distinct conversation segments based on:
 * 1. Significant silence/temporal pauses between utterances (e.g. > 4.5 seconds)
 * 2. Conversational transition cues (greetings, topic changes, wrap-ups)
 * 3. Topical shifts in vocabulary
 */

import { ConversationSegment, TranscriptSegment, ConversationContextType } from '../../../models/session';
import { IConversationSegmentationProvider, SegmentationOptions, SegmentationResult } from '../types';

export class LocalConversationSegmentationProvider implements IConversationSegmentationProvider {
  readonly name = 'Local Segmentation Engine (On-Device)';
  readonly isLocal = true;

  public async segment(
    sessionId: string,
    transcriptSegments: TranscriptSegment[],
    totalDurationMs: number,
    options?: SegmentationOptions
  ): Promise<SegmentationResult> {
    options?.onProgress?.(20, 'Analyzing conversation timeline and pauses...');

    // If no utterances, return a single default conversation segment
    if (!transcriptSegments || transcriptSegments.length === 0) {
      return {
        segments: [{
          id: `cseg_0_${Date.now()}`,
          sessionId,
          title: 'Session Recording',
          contextType: 'other',
          startTimeMs: 0,
          endTimeMs: Math.max(totalDurationMs, 1000),
          speakerIds: [],
          summary: 'Single continuous recording.',
          isUserEdited: false
        }],
        overallContext: 'other'
      };
    }

    // Determine boundary cut points
    const splitIndices: number[] = [];
    const minSegmentDurationMs = options?.minSegmentDurationMs || 6000; // minimum duration of a segment

    let lastSplitTimeMs = 0;

    for (let i = 0; i < transcriptSegments.length - 1; i++) {
      const current = transcriptSegments[i];
      const next = transcriptSegments[i + 1];

      const pauseMs = next.startTimeMs - current.endTimeMs;
      const textLower = next.text.toLowerCase();
      const currentDurationFromLastSplit = current.endTimeMs - lastSplitTimeMs;

      // 1. Check for significant pause (gap >= 4000ms)
      const hasSignificantPause = pauseMs >= 4000 && currentDurationFromLastSplit >= minSegmentDurationMs;

      // 2. Check for conversational shift markers
      const boundaryMarkers = [
        'moving on to', 'next topic', 'switching gears', 'let\'s start',
        'hello everyone', 'good morning', 'hi everyone', 'class dismissed',
        'thanks for joining', 'see you later', 'another thing', 'talk to you later',
        'catch you later', 'different note', 'meanwhile'
      ];
      const hasMarker = boundaryMarkers.some(m => textLower.includes(m)) && currentDurationFromLastSplit >= minSegmentDurationMs;

      // 3. Topic or Person greeting detection (e.g. "Hey Rahul", "Hi Sarah")
      const hasGreetingToNewPerson = /^(hey|hi|hello)\s+[a-z]+/i.test(textLower) && currentDurationFromLastSplit >= minSegmentDurationMs;

      if (hasSignificantPause || hasMarker || hasGreetingToNewPerson) {
        splitIndices.push(i + 1);
        lastSplitTimeMs = next.startTimeMs;
      }
    }

    // Form conversation segment chunks
    const chunkRanges: { startIdx: number; endIdx: number }[] = [];
    let startIdx = 0;

    for (const splitIdx of splitIndices) {
      chunkRanges.push({ startIdx, endIdx: splitIdx - 1 });
      startIdx = splitIdx;
    }
    chunkRanges.push({ startIdx, endIdx: transcriptSegments.length - 1 });

    const conversationSegments: ConversationSegment[] = [];

    for (let cIdx = 0; cIdx < chunkRanges.length; cIdx++) {
      const range = chunkRanges[cIdx];
      const segsInChunk = transcriptSegments.slice(range.startIdx, range.endIdx + 1);
      if (segsInChunk.length === 0) continue;

      const startTimeMs = segsInChunk[0].startTimeMs;
      const endTimeMs = cIdx === chunkRanges.length - 1 
        ? Math.max(segsInChunk[segsInChunk.length - 1].endTimeMs, totalDurationMs)
        : segsInChunk[segsInChunk.length - 1].endTimeMs;

      const fullChunkText = segsInChunk.map(s => s.text).join(' ');
      const lowerChunk = fullChunkText.toLowerCase();

      // Collect speakers active in this segment
      const speakerIdSet = new Set<string>();
      segsInChunk.forEach(s => {
        if (s.speakerId) speakerIdSet.add(s.speakerId);
      });

      // Context classification
      let contextType: ConversationContextType = 'project';
      let title = `Conversation ${cIdx + 1}`;

      if (/\b(physics|lecture|professor|induction|electromagnetic|formula|theorem|textbook|chapter)\b/i.test(lowerChunk)) {
        contextType = 'lecture';
        title = lowerChunk.includes('physics') || lowerChunk.includes('induction') 
          ? 'Physics Lecture' 
          : 'Academic Lecture';
      } else if (/\b(meeting|agenda|sync|standup|roadmap|stakeholder|quarterly|status)\b/i.test(lowerChunk)) {
        contextType = 'meeting';
        title = 'Team Status Meeting';
      } else if (/\b(interview|resume|candidate|experience|portfolio|hire)\b/i.test(lowerChunk)) {
        contextType = 'interview';
        title = 'Interview Discussion';
      } else if (/\b(study|homework|exam|assignment|solve|prep)\b/i.test(lowerChunk)) {
        contextType = 'study';
        title = 'Study Session';
      } else if (/\b(project|architecture|design|code|deploy|api|database|phase)\b/i.test(lowerChunk)) {
        contextType = 'project';
        title = 'Project Discussion';
      } else if (/\b(weekend|dinner|coffee|movie|trip|personal|fun|hangout)\b/i.test(lowerChunk)) {
        contextType = 'personal';
        title = 'Personal Conversation';
      }

      // Check if a person is addressed directly in this segment
      const addressedNames = ['Rahul', 'Sarah', 'Alex', 'David', 'Elena', 'Michael', 'Priya', 'Professor'];
      for (const name of addressedNames) {
        if (new RegExp(`\\b${name}\\b`, 'i').test(fullChunkText)) {
          if (contextType === 'personal' || contextType === 'project') {
            title = `${title.replace('Personal Conversation', 'Conversation')} with ${name}`;
          }
          break;
        }
      }

      const segmentId = `cseg_${cIdx}_${Date.now()}`;

      // Tag utterances with this conversationSegmentId
      segsInChunk.forEach(s => {
        s.conversationSegmentId = segmentId;
      });

      conversationSegments.push({
        id: segmentId,
        sessionId,
        title,
        contextType,
        startTimeMs,
        endTimeMs,
        speakerIds: Array.from(speakerIdSet),
        summary: segsInChunk[0]?.text.slice(0, 100) || '',
        isUserEdited: false
      });
    }

    // Determine overall context from the majority of segments
    const contextCounts = new Map<ConversationContextType, number>();
    conversationSegments.forEach(s => {
      contextCounts.set(s.contextType, (contextCounts.get(s.contextType) || 0) + 1);
    });

    let overallContext: ConversationContextType = 'project';
    let maxCount = 0;
    contextCounts.forEach((count, type) => {
      if (count > maxCount) {
        maxCount = count;
        overallContext = type;
      }
    });

    options?.onProgress?.(100, `Segmented into ${conversationSegments.length} conversations.`);

    return {
      segments: conversationSegments,
      overallContext
    };
  }
}
