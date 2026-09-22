import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { databaseService } from '../services/storage/database';
import { LocalSpeakerDiarizationProvider } from '../services/diarization/providers/LocalSpeakerDiarizationProvider';
import { SpeakerDiarizationService } from '../services/diarization/SpeakerDiarizationService';
import { MemorySession, TranscriptSegment, SpeakerProfile } from '../models/session';

describe('Phase 4: Speaker Diarization & Identity Management', () => {
  const localProvider = new LocalSpeakerDiarizationProvider();

  beforeEach(async () => {
    const sessions = await databaseService.getAllSessions();
    for (const s of sessions) {
      await databaseService.deleteSession(s.id);
    }
    await databaseService.clearAllSpeakerProfiles();
  });

  afterEach(() => {
    databaseService.close();
  });

  describe('LocalSpeakerDiarizationProvider', () => {
    it('distinguishes Speaker 1 (You) and Speaker 2 (Interlocutor) across conversational turns', async () => {
      const utterances: TranscriptSegment[] = [
        {
          id: 'seg_1',
          startTimeMs: 0,
          endTimeMs: 3000,
          text: 'What do you think about the proposed timeline?'
        },
        {
          id: 'seg_2',
          startTimeMs: 3200,
          endTimeMs: 6500,
          text: 'I agree with the deadline, let us proceed.'
        },
        {
          id: 'seg_3',
          startTimeMs: 7000,
          endTimeMs: 10000,
          text: 'Great, shall we assign the backend tasks today?'
        }
      ];

      const result = await localProvider.diarize('session-diarize-1', utterances, 10000);

      expect(result.speakers.length).toBeGreaterThanOrEqual(2);
      expect(result.speakers[0].isUser).toBe(true);
      expect(result.speakers[0].label).toBe('You');

      expect(result.attributedSegments.length).toBe(3);
      // Turn alternation check
      expect(result.attributedSegments[0].speakerLabel).toBe('You');
      expect(result.attributedSegments[1].speakerLabel).not.toBe('You');
      expect(result.attributedSegments[2].speakerLabel).toBe('You');
    });

    it('identifies explicit interlocutor names addressed in the transcript', async () => {
      const utterances: TranscriptSegment[] = [
        {
          id: 'seg_1',
          startTimeMs: 0,
          endTimeMs: 4000,
          text: 'Hey Rahul, did you finish the database migration?'
        },
        {
          id: 'seg_2',
          startTimeMs: 4500,
          endTimeMs: 8000,
          text: 'Yes, everything is deployed and working smoothly.'
        }
      ];

      const result = await localProvider.diarize('session-diarize-2', utterances, 8000);

      const rahulSpeaker = result.speakers.find(s => s.name === 'Rahul' || s.label === 'Rahul');
      expect(rahulSpeaker).toBeDefined();
      expect(rahulSpeaker?.confidence).toBeGreaterThanOrEqual(0.75);
    });

    it('matches pre-existing known speaker profiles from previous sessions', async () => {
      const knownProfile: SpeakerProfile = {
        id: 'sp_known_sarah',
        label: 'Sarah',
        name: 'Sarah',
        isUser: false,
        confidence: 0.95,
        avatarColor: '#10b981',
        createdAt: 1700000000000,
        updatedAt: 1700000000000
      };

      const utterances: TranscriptSegment[] = [
        {
          id: 'seg_1',
          startTimeMs: 0,
          endTimeMs: 4000,
          text: 'Good morning Sarah, let us review the sprint goals.'
        },
        {
          id: 'seg_2',
          startTimeMs: 4200,
          endTimeMs: 7000,
          text: 'Sure, I have prepared the summary.'
        }
      ];

      const result = await localProvider.diarize('session-diarize-3', utterances, 7000, {
        knownProfiles: [knownProfile]
      });

      const matched = result.speakers.find(s => s.id === 'sp_known_sarah');
      expect(matched).toBeDefined();
      expect(matched?.name).toBe('Sarah');
    });

    it('orchestrates end-to-end diarization and persists speakers to IndexedDB session', async () => {
      const session: MemorySession = {
        id: 'session-diarize-service-1',
        title: 'Dialogue Session',
        startTime: 1700000000000,
        endTime: 1700000030000,
        durationMs: 30000,
        audioStorageKey: 'local://idb/audio_blobs/session-diarize-service-1',
        audioMimeType: 'audio/webm',
        audioSizeBytes: 20000,
        status: 'completed',
        createdAt: 1700000030000,
        updatedAt: 1700000030000,
        transcript: {
          id: 'tr_service_1',
          fullText: 'Hello Rahul. Hi there, I am ready.',
          language: 'en',
          segments: [
            { id: 'u1', startTimeMs: 0, endTimeMs: 4000, text: 'Hello Rahul.' },
            { id: 'u2', startTimeMs: 4500, endTimeMs: 8000, text: 'Hi there, I am ready.' }
          ],
          generatedAt: 1700000030000,
          engine: 'whisper',
          status: 'completed'
        }
      };

      await databaseService.saveSession(session);

      const service = SpeakerDiarizationService.getInstance();
      const updated = await service.diarizeSession('session-diarize-service-1');

      expect(updated.speakers).toBeDefined();
      expect(updated.speakers!.length).toBeGreaterThanOrEqual(2);
      expect(updated.transcript?.segments[0].speakerId).toBeDefined();
    });
  });

  describe('Speaker Identity, Renaming & On-Device Privacy', () => {
    it('renames a speaker, promotes confidence to 1.0, updates transcript labels and syncs global store', async () => {
      const session: MemorySession = {
        id: 'session-rename-1',
        title: 'Interview Session',
        startTime: 1700000000000,
        endTime: 1700000030000,
        durationMs: 30000,
        audioStorageKey: 'local://idb/audio_blobs/session-rename-1',
        audioMimeType: 'audio/webm',
        audioSizeBytes: 20000,
        status: 'completed',
        createdAt: 1700000030000,
        updatedAt: 1700000030000,
        speakers: [
          {
            id: 'sp_unknown_1',
            label: 'Speaker 2',
            name: undefined,
            isUser: false,
            confidence: 0.65,
            avatarColor: '#6366f1',
            createdAt: 1700000030000,
            updatedAt: 1700000030000
          }
        ],
        transcript: {
          id: 'tr_rename-1',
          fullText: 'Hello from candidate.',
          language: 'en',
          segments: [
            {
              id: 'seg_1',
              startTimeMs: 0,
              endTimeMs: 4000,
              text: 'Hello from candidate.',
              speakerId: 'sp_unknown_1',
              speakerLabel: 'Speaker 2',
              confidence: 0.65
            }
          ],
          generatedAt: 1700000030000,
          engine: 'whisper',
          status: 'completed'
        }
      };

      await databaseService.saveSession(session);

      // User identifies Speaker 2 as "Alex"
      const updated = await databaseService.renameSpeaker('session-rename-1', 'sp_unknown_1', 'Alex', false);

      const alexSpeaker = updated.speakers?.find(s => s.id === 'sp_unknown_1');
      expect(alexSpeaker?.name).toBe('Alex');
      expect(alexSpeaker?.confidence).toBe(1.0); // User confirmed
      expect(updated.transcript?.segments[0].speakerLabel).toBe('Alex');

      // Verify persistent global profile was stored
      const globalProfile = await databaseService.getSpeakerProfile('sp_unknown_1');
      expect(globalProfile).not.toBeNull();
      expect(globalProfile?.name).toBe('Alex');
    });

    it('enforces privacy: permanently deletes individual speaker profiles and allows complete profile wipe', async () => {
      const profile1: SpeakerProfile = {
        id: 'sp_delete_me',
        label: 'David',
        name: 'David',
        isUser: false,
        confidence: 0.9,
        avatarColor: '#ec4899',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      const profile2: SpeakerProfile = {
        id: 'sp_keep_me',
        label: 'Elena',
        name: 'Elena',
        isUser: false,
        confidence: 0.9,
        avatarColor: '#8b5cf6',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await databaseService.saveSpeakerProfile(profile1);
      await databaseService.saveSpeakerProfile(profile2);

      let allProfiles = await databaseService.getAllSpeakerProfiles();
      expect(allProfiles.length).toBe(2);

      // Permanently delete profile1
      await databaseService.deleteSpeakerProfile('sp_delete_me');
      expect(await databaseService.getSpeakerProfile('sp_delete_me')).toBeNull();
      expect(await databaseService.getSpeakerProfile('sp_keep_me')).not.toBeNull();

      // Complete privacy wipe
      await databaseService.clearAllSpeakerProfiles();
      allProfiles = await databaseService.getAllSpeakerProfiles();
      expect(allProfiles.length).toBe(0);
    });
  });
});
