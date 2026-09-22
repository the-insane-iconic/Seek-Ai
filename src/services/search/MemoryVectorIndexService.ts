/**
 * MemoryVectorIndexService — High-Performance Semantic Indexing & Retrieval Orchestrator
 * 
 * Automatically indexes sessions into granular memory units and provides
 * natural-language semantic vector retrieval across all stored memories.
 */

import { 
  MemorySession, 
  MemoryVectorRecord, 
  SearchResultItem, 
  MemoryEmbeddingUnitType 
} from '../../models/session';
import { databaseService } from '../storage/database';
import { IEmbeddingProvider, SearchOptions } from './types';
import { LocalSemanticVectorEngine } from './providers/LocalSemanticVectorEngine';
import { BackendAIEmbeddingProvider } from './providers/BackendAIEmbeddingProvider';

export class MemoryVectorIndexService {
  private static instance: MemoryVectorIndexService;
  private providers: Map<string, IEmbeddingProvider> = new Map();
  private activeProviderId = 'local';
  private localVectorEngine = new LocalSemanticVectorEngine();

  constructor() {
    this.providers.set('local', this.localVectorEngine);
    this.providers.set('backend', new BackendAIEmbeddingProvider());
  }

  public static getInstance(): MemoryVectorIndexService {
    if (!MemoryVectorIndexService.instance) {
      MemoryVectorIndexService.instance = new MemoryVectorIndexService();
    }
    return MemoryVectorIndexService.instance;
  }

  public getActiveProvider(): IEmbeddingProvider {
    return this.providers.get(this.activeProviderId) || this.localVectorEngine;
  }

  public setProvider(providerId: string): void {
    if (this.providers.has(providerId)) {
      this.activeProviderId = providerId;
    }
  }

  /**
   * Decompose a session into searchable memory units, compute vector embeddings, and save to IndexedDB
   */
  public async indexSession(session: MemorySession): Promise<number> {
    if (!session || !session.id) return 0;

    // Remove any previous vectors for this session first
    await databaseService.deleteVectorRecordsBySession(session.id);

    const units: {
      unitType: MemoryEmbeddingUnitType;
      unitId: string;
      content: string;
      speakerLabel?: string;
      timestampMs?: number;
      metadata?: Record<string, any>;
    }[] = [];

    // 1. Session Title & Context
    units.push({
      unitType: 'summary',
      unitId: `title_${session.id}`,
      content: `Session: ${session.title}. Context: ${session.contextType || 'General'}. ${session.customContext || ''}`,
      timestampMs: 0,
      metadata: { contextType: session.contextType }
    });    // 2. Structured Memory Units (if extracted)
    const mem = session.structuredMemory;
    if (mem) {
      // Summary
      if (typeof mem.summary === 'string' && (mem.summary as string).trim()) {
        units.push({
          unitType: 'summary',
          unitId: `summary_${session.id}`,
          content: (mem.summary as string).trim(),
          timestampMs: 0
        });
      } else if (mem.summary?.oneLiner) {
        units.push({
          unitType: 'summary',
          unitId: `summary_${session.id}`,
          content: `${mem.summary.oneLiner}. Key takeaways: ${mem.summary.keyTakeaways?.join('; ') || ''}`,
          timestampMs: 0
        });
      }

      // Decisions
      for (const d of mem.decisions || []) {
        const ts = d.sourceTimestampMs ?? (d as any).timestampMs ?? 0;
        units.push({
          unitType: 'decision',
          unitId: d.id,
          content: `Decision: ${d.decision}. Agreed by: ${d.madeBy?.join(', ') || 'Team'}. Context: ${d.context || ''}`,
          speakerLabel: d.madeBy?.[0],
          timestampMs: ts,
          metadata: { madeBy: d.madeBy }
        });
      }

      // Tasks
      for (const t of mem.tasks || []) {
        const ts = t.sourceTimestampMs ?? (t as any).timestampMs ?? 0;
        const assignee = t.assignedTo || (t as any).assignee || 'Unassigned';
        const due = t.dueDate || (t as any).deadline || 'Unspecified';
        units.push({
          unitType: 'task',
          unitId: t.id,
          content: `Task: ${t.task}. Assigned to: ${assignee}. Due: ${due}`,
          speakerLabel: assignee !== 'Unassigned' ? assignee : undefined,
          timestampMs: ts,
          metadata: { assignedTo: assignee, dueDate: due, completed: t.completed }
        });
      }

      // Questions
      for (const q of mem.questions || []) {
        units.push({
          unitType: 'question',
          unitId: q.id,
          content: `Question: ${q.question}. Asked by: ${q.askedBy || 'Unknown'}. Answer: ${q.answer || 'Unanswered'}`,
          speakerLabel: q.askedBy,
          timestampMs: q.sourceTimestampMs || 0
        });
      }

      // Ideas
      for (const i of mem.ideas || []) {
        units.push({
          unitType: 'idea',
          unitId: i.id,
          content: `Idea: ${i.idea}. Proposed by: ${i.proposedBy || 'Participant'}`,
          speakerLabel: i.proposedBy,
          timestampMs: i.sourceTimestampMs || 0
        });
      }

      // Facts
      for (const f of mem.facts || []) {
        units.push({
          unitType: 'fact',
          unitId: f.id,
          content: `Fact: ${f.fact}. Category: ${f.category || 'General'}`,
          timestampMs: f.sourceTimestampMs || 0
        });
      }

      // Key points
      for (const kp of (mem as any).keyPoints || []) {
        const ts = kp.sourceTimestampMs ?? kp.timestampMs ?? 0;
        units.push({
          unitType: 'summary',
          unitId: kp.id || `kp_${Math.random()}`,
          content: `Key Point: ${kp.point}`,
          timestampMs: ts
        });
      }

      // Topics & People
      for (const top of mem.topics || []) {
        const topicName = (top as any).topic || (top as any).name || '';
        units.push({
          unitType: 'topic',
          unitId: top.id,
          content: `Topic discussed: ${topicName}`,
          timestampMs: 0
        });
      }

      for (const p of mem.people || []) {
        units.push({
          unitType: 'person',
          unitId: p.id,
          content: `Person mentioned: ${p.name}. Role: ${p.role || 'Participant'}`,
          timestampMs: p.sourceTimestampMs || 0
        });
      }

      // Dates / Deadlines
      const datesList = (mem as any).datesDeadlines || (mem as any).dates || [];
      for (const dt of datesList) {
        units.push({
          unitType: 'decision',
          unitId: dt.id || `date_${Math.random()}`,
          content: `Date/Deadline: ${dt.date}. Event: ${dt.event || dt.description || ''}`,
          timestampMs: dt.sourceTimestampMs ?? 0
        });
      }
    }

    // 3. Conversation Segments
    const allSegments = session.conversationSegments || (session as any).segments || [];
    for (const seg of allSegments) {
      units.push({
        unitType: 'conversation_segment',
        unitId: seg.id,
        content: `Conversation Segment: ${seg.title}. Type: ${seg.contextType || 'Discussion'}. Summary: ${seg.summary || ''}`,
        timestampMs: seg.startTimeMs,
        metadata: { contextType: seg.contextType, startTimeMs: seg.startTimeMs, endTimeMs: seg.endTimeMs }
      });
    }

    // 4. Transcript Utterance Chunks (Group 2-3 consecutive utterances for rich conversational context)
    const utterances = session.transcript?.segments || [];
    const chunkSize = 2;
    for (let i = 0; i < utterances.length; i += chunkSize) {
      const slice = utterances.slice(i, i + chunkSize);
      const text = slice.map(u => `${u.speakerLabel || (u as any).speaker || 'Speaker'}: ${u.text}`).join(' ');
      const first = slice[0];
      const last = slice[slice.length - 1];
      const startMs = first.startTimeMs ?? (first as any).startMs ?? 0;
      const endMs = last.endTimeMs ?? (last as any).endMs ?? 0;
      units.push({
        unitType: 'transcript_chunk',
        unitId: `chunk_${i}`,
        content: text,
        speakerLabel: first.speakerLabel || (first as any).speaker,
        timestampMs: startMs,
        metadata: {
          startIndex: i,
          count: slice.length,
          startTimeMs: startMs,
          endTimeMs: endMs
        }
      });
    }

    // If transcript only has fullText / rawText and no segments
    const transcriptText = session.transcript?.fullText || (session.transcript as any)?.rawText;
    if (utterances.length === 0 && transcriptText) {
      units.push({
        unitType: 'transcript_chunk',
        unitId: 'chunk_raw',
        content: transcriptText,
        timestampMs: 0
      });
    }

    if (units.length === 0) return 0;

    // Batch vectorization
    const provider = this.getActiveProvider();
    const textsToEmbed = units.map(u => u.content);
    const vectors = await provider.embed(textsToEmbed);

    const records: MemoryVectorRecord[] = units.map((u, idx) => ({
      id: `vec_${session.id}_${u.unitType}_${u.unitId}`,
      sessionId: session.id,
      sessionTitle: session.title,
      sessionDate: session.startTime,
      unitType: u.unitType,
      unitId: u.unitId,
      content: u.content,
      vector: vectors[idx] || new Array(provider.dimensions).fill(0),
      speakerLabel: u.speakerLabel,
      timestampMs: u.timestampMs,
      metadata: u.metadata,
      createdAt: Date.now()
    }));

    await databaseService.saveVectorRecords(records);
    return records.length;
  }

  /**
   * Search across all stored memory vectors using natural language and semantic similarity
   */
  public async search(query: string, options?: SearchOptions): Promise<SearchResultItem[]> {
    if (!query || !query.trim()) return [];

    const allRecords = await databaseService.getAllVectorRecords();
    if (allRecords.length === 0) return [];

    // Filter by sessionId or unitTypes if specified
    const filtered = allRecords.filter(rec => {
      if (options?.sessionId && rec.sessionId !== options.sessionId) return false;
      if (options?.unitTypes && options.unitTypes.length > 0 && !options.unitTypes.includes(rec.unitType)) return false;
      return true;
    });

    if (filtered.length === 0) return [];

    // Vectorize query
    const provider = this.getActiveProvider();
    const [queryVector] = await provider.embed([query]);

    const minScore = options?.minScore !== undefined ? options.minScore : 0.25;
    const scoredResults: SearchResultItem[] = [];

    for (const record of filtered) {
      const { score, matchType } = LocalSemanticVectorEngine.hybridSimilarity(
        query, 
        record.content, 
        queryVector, 
        record.vector
      );

      if (score >= minScore) {
        const rounded = Math.round(score * 100) / 100;
        scoredResults.push({
          record,
          similarityScore: rounded,
          score: rounded,
          matchType,
          highlightSnippet: this.generateHighlightSnippet(record.content, query)
        });
      }
    }

    // Sort descending by similarity score
    scoredResults.sort((a, b) => b.similarityScore - a.similarityScore);

    const limit = options?.limit || options?.topK || 25;
    return scoredResults.slice(0, limit);
  }

  /**
   * Re-index all sessions across the database
   */
  public async reindexAllSessions(sessions: MemorySession[]): Promise<{ totalIndexed: number }> {
    await databaseService.clearAllVectorRecords();
    let total = 0;
    for (const s of sessions) {
      const count = await this.indexSession(s);
      total += count;
    }
    return { totalIndexed: total };
  }

  /**
   * Produce a clean, highlighted snippet preview around query terms
   */
  private generateHighlightSnippet(content: string, _query: string): string {
    if (content.length <= 160) return content;
    return content.substring(0, 160) + '...';
  }
}

export const memoryVectorIndexService = MemoryVectorIndexService.getInstance();
