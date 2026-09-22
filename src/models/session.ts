/**
 * Core Data Models for Memory
 * 
 * Phase 1 implements user-controlled Memory Sessions and local audio storage.
 * The schema is designed with modular forward-compatible extension hooks
 * for future AI processing layers (Speech-to-Text, Speaker Recognition,
 * Structured Memory Extraction, AI Summarization, and Vector Embeddings).
 */

export type SessionStatus = 'active' | 'completed' | 'discarded' | 'interrupted';

export type TranscriptionStatus = 
  | 'idle' 
  | 'waiting' 
  | 'uploading' 
  | 'transcribing' 
  | 'completed' 
  | 'failed';

/**
 * Phase 2 Extension: Speech-to-Text Utterance & Word Timestamps
 */
export interface TranscriptWord {
  word: string;
  startTimeMs: number;
  endTimeMs: number;
  confidence: number;
}

export interface TranscriptSegment {
  id: string;
  speakerId?: string;
  startTimeMs: number;
  endTimeMs: number;
  text: string;
  words?: TranscriptWord[];
}

export interface TranscriptData {
  id: string;
  fullText: string;
  language: string;
  segments: TranscriptSegment[];
  generatedAt: number;
  engine: string;
  status: TranscriptionStatus;
  error?: string;
  isEdited?: boolean;
  originalText?: string;
  editedAt?: number;
}

/**
 * Phase 2+ Extension Hook: Speaker Recognition Profile
 */
export interface SpeakerProfile {
  id: string;
  label: string; // e.g. "Speaker 1" or "User"
  name?: string;  // e.g. "Ansh"
  isUser: boolean;
  avatarColor?: string;
}

export type ExtractionStatus = 'idle' | 'extracting' | 'completed' | 'failed';

export interface MemoryPerson {
  id: string;
  name: string;
  role?: string;
  mentionCount: number;
  sourceTimestampMs?: number;
  isUserEdited?: boolean;
  isUserCreated?: boolean;
}

export interface MemoryTopic {
  id: string;
  name: string;
  isUserEdited?: boolean;
  isUserCreated?: boolean;
}

export interface MemoryKeyPoint {
  id: string;
  point: string;
  sourceTimestampMs?: number;
  isUserEdited?: boolean;
  isUserCreated?: boolean;
}

export interface MemoryQuestion {
  id: string;
  question: string;
  status: 'open' | 'answered';
  answer?: string;
  sourceTimestampMs?: number;
  isUserEdited?: boolean;
  isUserCreated?: boolean;
}

export interface MemoryIdea {
  id: string;
  idea: string;
  sourceTimestampMs?: number;
  isUserEdited?: boolean;
  isUserCreated?: boolean;
}

export interface MemoryDecision {
  id: string;
  decision: string;
  context?: string;
  sourceTimestampMs?: number;
  isUserEdited?: boolean;
  isUserCreated?: boolean;
}

export interface MemoryTask {
  id: string;
  task: string;
  assignee?: string;
  dueDate?: string;
  completed: boolean;
  sourceTimestampMs?: number;
  isUserEdited?: boolean;
  isUserCreated?: boolean;
}

export interface MemoryCommitment {
  id: string;
  commitment: string;
  fromPerson?: string;
  toPerson?: string;
  sourceTimestampMs?: number;
  isUserEdited?: boolean;
  isUserCreated?: boolean;
}

export interface MemoryDateDeadline {
  id: string;
  date: string;
  description: string;
  sourceTimestampMs?: number;
  isUserEdited?: boolean;
  isUserCreated?: boolean;
}

export interface MemoryEvent {
  id: string;
  title: string;
  dateOrTime?: string;
  location?: string;
  sourceTimestampMs?: number;
  isUserEdited?: boolean;
  isUserCreated?: boolean;
}

export interface MemoryFact {
  id: string;
  fact: string;
  category?: string;
  sourceTimestampMs?: number;
  isUserEdited?: boolean;
  isUserCreated?: boolean;
}

export interface MemorySummary {
  oneLiner: string;
  keyTakeaways: string[];
  isUserEdited?: boolean;
}

/**
 * Phase 3: Complete Structured Memory Model
 */
export interface StructuredMemory {
  id: string;
  sessionId: string;
  status: ExtractionStatus;
  summary?: MemorySummary;
  people: MemoryPerson[];
  topics: MemoryTopic[];
  keyPoints: MemoryKeyPoint[];
  questions: MemoryQuestion[];
  ideas: MemoryIdea[];
  decisions: MemoryDecision[];
  tasks: MemoryTask[];
  commitments: MemoryCommitment[];
  dates: MemoryDateDeadline[];
  events: MemoryEvent[];
  facts: MemoryFact[];
  extractedAt: number;
  modelUsed: string;
  error?: string;
  isUserEdited?: boolean;
}

/**
 * Phase 2+ Extension Hook: Vector Embeddings for Semantic Search
 */
export interface EmbeddingVector {
  vectorId: string;
  model: string;
  dimensions: number;
  chunkIndex: number;
}

/**
 * Core MemorySession entity
 */
export interface MemorySession {
  // Phase 1 Core Fields
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  audioStorageKey: string;
  audioMimeType: string;
  audioSizeBytes: number;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;

  // Future Phase Expansion Fields (Optional/Nullable in Phase 1)
  transcript?: TranscriptData;
  speakers?: SpeakerProfile[];
  structuredMemory?: StructuredMemory;
  embeddings?: EmbeddingVector[];
}

/**
 * Input for creating a new session
 */
export interface CreateSessionDTO {
  id?: string;
  title?: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  audioStorageKey: string;
  audioMimeType: string;
  audioSizeBytes: number;
  status?: SessionStatus;
}

/**
 * Utility helpers
 */

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
}

export function formatDuration(durationMs: number): string {
  if (!durationMs || durationMs < 0) return '00:00';
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatSessionDate(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatSessionTime(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function generateDefaultSessionTitle(timestamp: number): string {
  const date = new Date(timestamp);
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `Memory • ${dateStr}, ${timeStr}`;
}
