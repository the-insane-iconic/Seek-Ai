/**
 * BackendAIEmbeddingProvider — Cloud Proxy Vector Embeddings (OpenAI text-embedding-3-small)
 */

import { IEmbeddingProvider } from '../types';
import { LocalSemanticVectorEngine } from './LocalSemanticVectorEngine';

export class BackendAIEmbeddingProvider implements IEmbeddingProvider {
  readonly name = 'OpenAI Cloud Embeddings (text-embedding-3-small)';
  readonly isLocal = false;
  readonly dimensions = 1536;

  private localFallback = new LocalSemanticVectorEngine();

  public async embed(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) return [];

    try {
      const response = await fetch('/api/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts })
      });

      if (!response.ok) {
        throw new Error(`Embedding proxy failed with status: ${response.status}`);
      }

      const data = await response.json();
      if (data.code === 'NO_API_KEY' || !data.embeddings) {
        return this.localFallback.embed(texts);
      }

      return data.embeddings;
    } catch (_err) {
      // Fallback silently to on-device semantic vectorizer
      return this.localFallback.embed(texts);
    }
  }
}
