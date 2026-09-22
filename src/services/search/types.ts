/**
 * Search & Vector Embedding Types — Phase 5
 */

import { MemoryEmbeddingUnitType, SearchResultItem } from '../../models/session';

export interface IEmbeddingProvider {
  readonly name: string;
  readonly isLocal: boolean;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

export interface SearchOptions {
  unitTypes?: MemoryEmbeddingUnitType[];
  minScore?: number;
  limit?: number;
  topK?: number;
  sessionId?: string;
}

export interface ISemanticSearchEngine {
  search(query: string, options?: SearchOptions): Promise<SearchResultItem[]>;
}
