import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { databaseService } from '../services/storage/database';
import { LocalConversationSegmentationProvider } from '../services/segmentation/providers/LocalConversationSegmentationProvider';
import { ConversationSegmentationService } from '../services/segmentation/ConversationSegmentationService';
import { MemorySession, TranscriptSegment, ConversationSegment } from '../models/session';

describe('Phase 4: Conversation Segmentation', () => {
  const localProvider = new LocalConversationSegmentationProvider();

  beforeEach(async () => {
    const sessions = await databaseService.getAllSessions();
    for (const s of sessions) {
      await databaseService.deleteSession(s.id);
    }
  });

  afterEach(() => {
    databaseService.close();
  });

  describe('LocalConversationSegmentationProvider', () => {
    it('divides multi-conversation audio into distinct segments based on pauses and topic cues', async () => {
      const utterances: TranscriptSegment[] = [
        // Conversation 1: Physics Lecture (0 to 12s)
        {
          id: 'u1',
          startTimeMs: 0,
          endTimeMs: 5000,
          text: 'Good morning everyone, welcome to the physics lecture on quantum mechanics and thermodynamics.'
        },
        {
          id: 'u2',
          startTimeMs: 5200,
          endTimeMs: 11000,
          text: 'Remember that the assignment on thermodynamics is due on Friday.'
        },
        // Significant pause: 11s to 20s (9s gap >= 4s threshold)
        // Conversation 2: Discussion with Rahul (20s to 32s)
        {
          id: 'u3',
          startTimeMs: 20000,
          endTimeMs: 26000,
          text: 'Hey Rahul, let us discuss the project architecture and the frontend design.'
        },
        {
          id: 'u4',
          startTimeMs: 26500,
          endTimeMs: 32000,
          text: 'I agree, let us use IndexedDB for local offline storage.'
        }
      ];

      const result = await localProvider.segment('session-seg-1', utterances, 35000);

      expect(result.segments.length).toBeGreaterThanOrEqual(2);
      expect(result.segments[0].startTimeMs).toBe(0);
      expect(result.segments[0].endTimeMs).toBeLessThanOrEqual(20000);
      expect(result.segments[1].startTimeMs).toBe(20000);
      
      // Verify context classification
      expect(result.segments[0].contextType).toBe('lecture');
      expect(result.segments[1].contextType).toBe('project');
    });

    it('falls back gracefully to a single segment if transcript is empty', async () => {
      const result = await localProvider.segment('session-empty', [], 10000);
      expect(result.segments.length).toBe(1);
      expect(result.segments[0].title).toBe('Session Recording');
      expect(result.segments[0].endTimeMs).toBe(10000);
    });
  });

  describe('ConversationSegmentationService & Database Mutations', () => {
    it('orchestrates segmentation pipeline and stores segments in IndexedDB session', async () => {
      const session: MemorySession = {
        id: 'session-orchestrate-1',
        title: 'Mixed Day Recording',
        startTime: 1700000000000,
        endTime: 1700000060000,
        durationMs: 60000,
        audioStorageKey: 'local://idb/audio_blobs/session-orchestrate-1',
        audioMimeType: 'audio/webm',
        audioSizeBytes: 45000,
        status: 'completed',
        createdAt: 1700000060000,
        updatedAt: 1700000060000,
        transcript: {
          id: 'tr_orchestrate-1',
          fullText: 'Good morning class. Today is physics. ... Hey Rahul, how is the project going?',
          language: 'en',
          segments: [
            { id: 'u1', startTimeMs: 0, endTimeMs: 8000, text: 'Good morning class. Today is physics.' },
            { id: 'u2', startTimeMs: 18000, endTimeMs: 25000, text: 'Hey Rahul, how is the project going?' }
          ],
          generatedAt: 1700000060000,
          engine: 'whisper',
          status: 'completed'
        }
      };

      await databaseService.saveSession(session);

      const service = ConversationSegmentationService.getInstance();
      const updated = await service.segmentSession('session-orchestrate-1');

      expect(updated.conversationSegments).toBeDefined();
      expect(updated.conversationSegments!.length).toBeGreaterThanOrEqual(1);

      // Verify fetch from IndexedDB
      const fetched = await databaseService.getSession('session-orchestrate-1');
      expect(fetched?.conversationSegments?.length).toBe(updated.conversationSegments!.length);
    });

    it('splits a conversation segment into two at a user-specified timestamp', async () => {
      const initialSegments: ConversationSegment[] = [
        {
          id: 'cseg_1',
          sessionId: 'session-split-1',
          title: 'Morning Meeting',
          contextType: 'meeting',
          startTimeMs: 0,
          endTimeMs: 60000,
          speakerIds: ['sp1', 'sp2'],
          isUserEdited: false
        }
      ];

      const utterances: TranscriptSegment[] = [
        { id: 'u1', startTimeMs: 10000, endTimeMs: 20000, text: 'Agenda review', conversationSegmentId: 'cseg_1' },
        { id: 'u2', startTimeMs: 35000, endTimeMs: 50000, text: 'Budget discussion', conversationSegmentId: 'cseg_1' }
      ];

      const session: MemorySession = {
        id: 'session-split-1',
        title: 'Meeting Session',
        startTime: 1700000000000,
        endTime: 1700000060000,
        durationMs: 60000,
        audioStorageKey: 'local://idb/audio_blobs/session-split-1',
        audioMimeType: 'audio/webm',
        audioSizeBytes: 40000,
        status: 'completed',
        createdAt: 1700000060000,
        updatedAt: 1700000060000,
        conversationSegments: initialSegments,
        transcript: {
          id: 'tr_split-1',
          fullText: 'Agenda review. Budget discussion.',
          language: 'en',
          segments: utterances,
          generatedAt: 1700000060000,
          engine: 'whisper',
          status: 'completed'
        }
      };

      await databaseService.saveSession(session);

      // Split at 30000ms (30 seconds)
      const updated = await databaseService.splitConversationSegment(
        'session-split-1',
        'cseg_1',
        30000,
        'Budget Deep Dive'
      );

      expect(updated.conversationSegments?.length).toBe(2);
      expect(updated.conversationSegments![0].startTimeMs).toBe(0);
      expect(updated.conversationSegments![0].endTimeMs).toBe(30000);
      expect(updated.conversationSegments![1].startTimeMs).toBe(30000);
      expect(updated.conversationSegments![1].endTimeMs).toBe(60000);
      expect(updated.conversationSegments![1].title).toBe('Budget Deep Dive');

      // Verify transcript utterances are reassigned to the split segment
      const updatedUtterances = updated.transcript?.segments;
      expect(updatedUtterances?.[0].conversationSegmentId).toBe('cseg_1');
      expect(updatedUtterances?.[1].conversationSegmentId).toBe(updated.conversationSegments![1].id);
    });

    it('merges two adjacent conversation segments together', async () => {
      const initialSegments: ConversationSegment[] = [
        {
          id: 'cseg_a',
          sessionId: 'session-merge-1',
          title: 'Intro Talk',
          contextType: 'meeting',
          startTimeMs: 0,
          endTimeMs: 20000,
          speakerIds: ['sp1'],
          summary: 'Discussed introduction.',
          isUserEdited: false
        },
        {
          id: 'cseg_b',
          sessionId: 'session-merge-1',
          title: 'Planning Talk',
          contextType: 'meeting',
          startTimeMs: 20000,
          endTimeMs: 45000,
          speakerIds: ['sp2'],
          summary: 'Covered planning.',
          isUserEdited: false
        }
      ];

      const utterances: TranscriptSegment[] = [
        { id: 'u1', startTimeMs: 5000, endTimeMs: 15000, text: 'Hello team', conversationSegmentId: 'cseg_a' },
        { id: 'u2', startTimeMs: 25000, endTimeMs: 40000, text: 'Let us plan the sprint', conversationSegmentId: 'cseg_b' }
      ];

      const session: MemorySession = {
        id: 'session-merge-1',
        title: 'Sprint Kickoff',
        startTime: 1700000000000,
        endTime: 1700000045000,
        durationMs: 45000,
        audioStorageKey: 'local://idb/audio_blobs/session-merge-1',
        audioMimeType: 'audio/webm',
        audioSizeBytes: 30000,
        status: 'completed',
        createdAt: 1700000045000,
        updatedAt: 1700000045000,
        conversationSegments: initialSegments,
        transcript: {
          id: 'tr_merge-1',
          fullText: 'Hello team. Let us plan the sprint.',
          language: 'en',
          segments: utterances,
          generatedAt: 1700000045000,
          engine: 'whisper',
          status: 'completed'
        }
      };

      await databaseService.saveSession(session);

      const merged = await databaseService.mergeConversationSegments(
        'session-merge-1',
        'cseg_a',
        'cseg_b'
      );

      expect(merged.conversationSegments?.length).toBe(1);
      const combined = merged.conversationSegments![0];
      expect(combined.startTimeMs).toBe(0);
      expect(combined.endTimeMs).toBe(45000);
      expect(combined.speakerIds).toContain('sp1');
      expect(combined.speakerIds).toContain('sp2');
      expect(combined.summary).toContain('Discussed introduction');
      expect(combined.summary).toContain('Covered planning');

      // Transcript utterances should now all point to combined.id
      for (const seg of merged.transcript!.segments) {
        expect(seg.conversationSegmentId).toBe(combined.id);
      }
    });
  });
});
