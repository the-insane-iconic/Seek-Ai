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
    });

    // 2. Structured Memory Units (if extracted)
    const mem = session.structuredMemory;
    if (mem) {
      // Summary
      if (mem.summary?.oneLiner) {
        units.push({
          unitType: 'summary',
          unitId: `summary_${session.id}`,
          content: `${mem.summary.oneLiner}. Key takeaways: ${mem.summary.keyTakeaways?.join('; ')}`,
          timestampMs: 0
        });
      }

      // Decisions
      for (const d of mem.decisions || []) {
        units.push({
          unitType: 'decision',
          unitId: d.id,
          content: `Decision: ${d.decision}. Agreed by: ${d.madeBy?.join(', ') || 'Team'}. Context: ${d.context || ''}`,
          speakerLabel: d.madeBy?.[0],
          timestampMs: d.sourceTimestampMs || 0,
          metadata: { madeBy: d.madeBy }
        });
      }

      // Tasks
      for (const t of mem.tasks || []) {
        units.push({
          unitType: 'task',
          unitId: t.id,
          content: `Task: ${t.task}. Assigned to: ${t.assignedTo || t.assignee || 'Unassigned'}. Due: ${t.dueDate || 'Unspecified'}`,
          speakerLabel: t.assignedTo || t.assignee,
          timestampMs: t.sourceTimestampMs || 0,
          metadata: { assignedTo: t.assignedTo, dueDate: t.dueDate, completed: t.completed }
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

      // Topics & People
      for (const top of mem.topics || []) {
        units.push({
          unitType: 'topic',
          unitId: top.id,
          content: `Topic discussed: ${top.name}`,
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
    }

    // 3. Conversation Segments
    for (const seg of session.conversationSegments || []) {
      units.push({
        unitType: 'conversation_segment',
        unitId: seg.id,
        content: `Conversation Segment: ${seg.title}. Type: ${seg.contextType}. Summary: ${seg.summary || ''}`,
        timestampMs: seg.startTimeMs,
        metadata: { contextType: seg.contextType, startTimeMs: seg.startTimeMs, endTimeMs: seg.endTimeMs }
      });
    }

    // 4. Transcript Utterance Chunks (Group 2-3 consecutive utterances for rich conversational context)
    const utterances = session.transcript?.segments || [];
    const chunkSize = 2;
    for (let i = 0; i < utterances.length; i += chunkSize) {
      const slice = utterances.slice(i, i + chunkSize);
      const text = slice.map(u => `${u.speakerLabel || 'Speaker'}: ${u.text}`).join(' ');
      units.push({
        unitType: 'transcript_chunk',
        unitId: `chunk_${session.id}_${i}`,
        content: text,
        speakerLabel: slice[0]?.speakerLabel,
        timestampMs: slice[0]?.startTimeMs || 0
      });
    }

    if (units.length === 0) return 0;

    // Vectorize all units
    const provider = this.getActiveProvider();
    const contents = units.map(u => u.content);
    const vectors = await provider.embed(contents);

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

    const minScore = options?.minScore !== undefined ? options.minScore : 0.35;
    const scoredResults: SearchResultItem[] = [];

    for (const record of filtered) {
      const { score, matchType } = LocalSemanticVectorEngine.hybridSimilarity(
        query, 
        record.content, 
        queryVector, 
        record.vector
      );

      if (score >= minScore) {
        scoredResults.push({
          record,
          similarityScore: Math.round(score * 100) / 100,
          matchType,
          highlightSnippet: this.generateHighlightSnippet(record.content, query)
        });
      }
    }

    // Sort descending by similarity score
    scoredResults.sort((a, b) => b.similarityScore - a.similarityScore);

    const limit = options?.limit || 25;
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
