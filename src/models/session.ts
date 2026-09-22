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

/**
 * Phase 2+ Extension Hook: Structured Memory & Action Items
 */
export interface StructuredMemory {
  topics: string[];
  decisions: string[];
  actionItems: {
    id: string;
    task: string;
    dueDate?: string;
    completed: boolean;
  }[];
  keyFacts: string[];
  sentiment?: 'positive' | 'neutral' | 'reflective' | 'urgent';
}

/**
 * Phase 2+ Extension Hook: AI Summary & Synthesis
 */
export interface AISummary {
  oneLiner: string;
  bulletPoints: string[];
  tags: string[];
  modelUsed: string;
  generatedAt: number;
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
  aiSummary?: AISummary;
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
