# Memory — AI-Powered Personal Memory System (Phase 1)

Memory is a mobile-first application designed to help users capture, organize, search, and understand meaningful information from their daily lives.

**Phase 1 Focus:** A reliable, privacy-first mobile foundation for user-controlled **Memory Sessions** with local audio recording, session metadata, playback, and IndexedDB storage.

---

## Architecture Layers

```
UI Layer (App.tsx, Header, StartSessionCard, ActiveRecordingModal, SessionList, SessionDetailModal)
   │
   ▼
Recording Service (RecordingService.ts — MediaRecorder, AudioContext Analyser, Permission Guard)
   │
   ▼
Local Storage Layer (database.ts — IndexedDB, audioFileManager.ts — Blob Management & Quota)
   │
   ▼
Data Model Layer (session.ts — MemorySession Schema + Future Extension Hooks)
```

---

## Getting Started

### Development Server
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your mobile browser or desktop browser.

### Run Automated Tests
```bash
npm test
```

### Production Build
```bash
npm run build
```

---

## Phase 2 Roadmap
- [ ] Speech-to-text (Whisper/Web Audio STT)
- [ ] Speaker recognition and diarization
- [ ] Structured memory extraction (tasks, decisions, topics)
- [ ] AI summaries and key takeaways
- [ ] Vector embeddings and semantic search
