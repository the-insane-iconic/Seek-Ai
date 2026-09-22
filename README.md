# Memory — AI-Powered Personal Memory System

Memory is a mobile-first application designed to help users capture, organize, search, and understand meaningful information from their daily lives.

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

- **Phase 3: Structured Memory & Semantic Intelligence** (Next)
  - Speaker diarization & voice profiles.
  - Automated extraction of Action Items, Decisions, and Topics.
  - Contextual AI summaries.
  - Vector embeddings and natural language memory search.

---

## Getting Started

### 1. Launch Dev Server
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your mobile or desktop browser.

### 2. Optional: Configure Cloud Whisper
If you would like to use OpenAI or Groq Whisper instead of the local on-device engine:
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
