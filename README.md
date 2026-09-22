# Memory — AI-Powered Personal Memory System

Memory is a mobile-first application designed to help users capture, organize, search, and understand meaningful information from their daily lives.

---

## Architecture Pipeline

$$\text{Audio} \longrightarrow \text{Segmented Conversation} \longrightarrow \text{Speakers} \longrightarrow \text{Transcript} \longrightarrow \text{Structured Memory}$$

---

## Phases Overview

- **Phase 1: User-Controlled Audio Capture & Local Storage** ✅
  - Explicit start/pause/resume/stop recording sessions.
  - High-precision timing and Web Audio API live waveform feedback.
  - On-device IndexedDB storage for metadata and binary audio blobs.
  - Complete CRUD: session renaming, export/download, and permanent purge.

- **Phase 2: Speech-to-Text Transcription & Mobile Responsiveness** ✅
  - Pluggable transcription provider interface (`ITranscriptionProvider`).
  - Backend proxy (`/api/transcribe`) keeping API keys strictly on the server.
  - Zero permanent server storage of audio recordings.
  - On-device local engine fallback for offline and demo usage.
  - Safe chunking of long recordings (>15MB) with timestamp offset recalculation.
  - Interactive transcript UI with tap-to-seek segment timestamps and active playback sync.
  - Safe transcript editing with "Edited • Original Preserved" indicators and raw transcript comparison.
  - Explicit privacy consent modal before audio is sent.
  - Complete mobile responsiveness overhaul: `100dvh` viewport, safe-area insets, mobile bottom sheet ergonomics, and ≥44px touch targets.

- **Phase 3: Structured Memory Extraction & Entity Management** ✅
  - Comprehensive memory extraction: People, Topics, Key Points, Questions, Ideas, Decisions, Tasks, Commitments, Dates/Deadlines.
  - Clean extraction provider abstraction (`IMemoryExtractionProvider`) with Local Simulated & Backend AI options.
  - Complete entity lifecycle management: toggle task completion, edit items, add custom items, and delete items.
  - Data integrity guarantee: structured memory modifications preserve original audio and transcript text.

- **Phase 4: Speaker Awareness & Conversation Segmentation** ✅
  - Multi-conversation segmentation: divides multi-topic recordings into distinct segments (e.g. *09:10 Physics Lecture*, *10:20 Conversation with Rahul*).
  - Conversation context classification: Lecture, Meeting, Personal, Interview, Project Discussion, Study Session, or Other with custom titles.
  - Manual segmentation control: rename segments, split at precise timestamp sliders, or merge adjacent segments.
  - Acoustic turn-taking speaker diarization: separates User ("You") and interlocutors ("Speaker 2", "Speaker 3") with confidence scores.
  - Persistent speaker profiles (`STORES.SPEAKERS` in IndexedDB): identify a speaker once, recognized across future sessions.
  - Speaker-attributed structured memories: decisions (`madeBy`), tasks (`assignedTo`, `assignedBy`), questions (`askedBy`), commitments (`fromPerson`).
  - Speaker-aware dialogue view: modern chat bubbles, avatars, speaker chips, inline speaker switcher, and timestamp audio sync.
  - Dedicated Voice Privacy & Identity Manager (`SpeakerPrivacyModal`): inspect profiles, toggle "This is Me", delete profiles, or full wipe.

- **Phase 5: Semantic Search & Vector Intelligence** (Next)
  - Vector embeddings and cross-session search.
  - Conversational AI memory assistant.
  - Natural language querying across tasks, decisions, and people.

---

## Getting Started

### 1. Launch Dev Server
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your mobile or desktop browser.

### 2. Optional: Configure Cloud AI Engines
If you would like to use OpenAI or Groq for transcription, diarization, segmentation, and memory extraction:
```bash
export OPENAI_API_KEY="sk-..."
# or: export GROQ_API_KEY="gsk_..."
npm run dev
```

### 3. Run Automated Tests
```bash
npm test
```

### 4. Build for Production
```bash
npm run build
```
