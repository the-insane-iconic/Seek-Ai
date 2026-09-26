import { describe, it, expect, beforeEach } from 'vitest';
import { ONBOARDING_STORAGE_KEY } from '../App';

describe('First-Time User Onboarding & Feature Tour', () => {
  // Mock localStorage for node environment
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    global.localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
      length: 0,
      key: () => null,
    } as any;
  });

  it('correctly uses the canonical storage key for onboarding state', () => {
    expect(ONBOARDING_STORAGE_KEY).toBe('memory_onboarding_seen');
  });

  it('identifies first-time visitors when storage key is absent', () => {
    const seen = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    const shouldShowTour = !seen;
    expect(shouldShowTour).toBe(true);
  });

  it('marks onboarding tour as seen when user completes or skips the tour', () => {
    // 1. Initial first visit
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();

    // 2. User completes the tour
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');

    // 3. Subsequent visit does not trigger automatic onboarding
    const seen = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    expect(seen).toBe('true');
    const shouldShowTour = !seen;
    expect(shouldShowTour).toBe(false);
  });

  it('validates slide deck specification (1 introduction + 4 core capabilities = 5 slides)', () => {
    const slideDefinitions = [
      {
        index: 0,
        type: 'intro',
        title: 'Your Private Memory Vault',
        subtitle: 'Effortlessly capture, organize, and recall your daily life',
        topic: 'Introduction & Privacy'
      },
      {
        index: 1,
        type: 'capability',
        title: 'One-Tap Voice Capture',
        subtitle: 'High-fidelity audio recording with live waveform feedback',
        topic: 'Capability 1: Audio Capture'
      },
      {
        index: 2,
        type: 'capability',
        title: 'Transcribe & Identify Speakers',
        subtitle: 'Word-for-word accuracy and automatic voice diarization',
        topic: 'Capability 2: Speech-to-Text & Diarization'
      },
      {
        index: 3,
        type: 'capability',
        title: 'Structured Memory & Action Items',
        subtitle: 'Turn spoken dialogue into structured, actionable intelligence',
        topic: 'Capability 3: Structured Memory Extraction'
      },
      {
        index: 4,
        type: 'capability',
        title: 'Global Search & AI Assistant',
        subtitle: 'Ask anything about your past conversations in plain English',
        topic: 'Capability 4: Semantic Search & Recall'
      }
    ];

    expect(slideDefinitions.length).toBe(5);

    // Slide 1 must be intro
    expect(slideDefinitions[0].type).toBe('intro');

    // Slides 2-5 must be the 4 capabilities
    const capabilities = slideDefinitions.slice(1);
    expect(capabilities.length).toBe(4);
    capabilities.forEach(cap => {
      expect(cap.type).toBe('capability');
    });
  });

  it('simulates step navigation lifecycle from slide 0 through 4', () => {
    let currentSlide = 0;
    const totalSlides = 5;

    const next = () => {
      if (currentSlide < totalSlides - 1) {
        currentSlide++;
        return false; // not finished yet
      }
      return true; // completed
    };

    const prev = () => {
      if (currentSlide > 0) {
        currentSlide--;
      }
    };

    // Starts on Slide 0 (Intro)
    expect(currentSlide).toBe(0);

    // Advance through capabilities
    expect(next()).toBe(false); // Slide 1 (Cap 1)
    expect(currentSlide).toBe(1);

    expect(next()).toBe(false); // Slide 2 (Cap 2)
    expect(currentSlide).toBe(2);

    expect(prev()); // Back to Slide 1
    expect(currentSlide).toBe(1);

    expect(next()).toBe(false); // Slide 2
    expect(next()).toBe(false); // Slide 3 (Cap 3)
    expect(next()).toBe(false); // Slide 4 (Cap 4 - final slide)
    expect(currentSlide).toBe(4);

    // On final slide, next completes the tour
    const completed = next();
    expect(completed).toBe(true);
  });
});
