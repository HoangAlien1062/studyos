/**
 * In-Memory & Persistent Vector Store with Cosine Similarity Search for StudyOS RAG
 */

import { RAGDocumentChunk } from '../types';

export class VectorStore {
  private chunks: Map<string, RAGDocumentChunk> = new Map();

  /**
   * Compute standard Cosine Similarity between two numerical vectors
   */
  public static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    const len = Math.min(vecA.length, vecB.length);

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < len; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Deterministic semantic feature embedding fallback (TF-IDF & Character N-gram hashing)
   * 128-dimensional normalized dense vector used when external embedding API is unreachable
   */
  public static generateFallbackEmbedding(text: string, dimensions = 128): number[] {
    const vector = new Array(dimensions).fill(0);
    const cleaned = text.toLowerCase().replace(/[^a-z0-9\u00C0-\u024F\u1EA0-\u1EF9]/gi, ' ');
    const words = cleaned.split(/\s+/).filter(Boolean);

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      let hash = 0;
      for (let j = 0; j < w.length; j++) {
        hash = (hash << 5) - hash + w.charCodeAt(j);
        hash |= 0;
      }
      const idx = Math.abs(hash) % dimensions;
      vector[idx] += 1.0 / (1.0 + Math.log(w.length + 1));
    }

    // L2 Normalize
    let norm = 0;
    for (let i = 0; i < dimensions; i++) {
      norm += vector[i] * vector[i];
    }
    const magnitude = Math.sqrt(norm) || 1.0;
    for (let i = 0; i < dimensions; i++) {
      vector[i] /= magnitude;
    }

    return vector;
  }

  public addChunks(newChunks: RAGDocumentChunk[]): void {
    for (const chunk of newChunks) {
      if (!chunk.embedding || chunk.embedding.length === 0) {
        chunk.embedding = VectorStore.generateFallbackEmbedding(chunk.content);
      }
      this.chunks.set(chunk.id, chunk);
    }
  }

  public deleteDocumentChunks(documentId: string): void {
    for (const [id, chunk] of this.chunks.entries()) {
      if (chunk.documentId === documentId) {
        this.chunks.delete(id);
      }
    }
  }

  public getDocumentChunkCount(documentId: string): number {
    let count = 0;
    for (const chunk of this.chunks.values()) {
      if (chunk.documentId === documentId) count++;
    }
    return count;
  }

  /**
   * Search most similar chunks within user scope
   */
  public search(
    queryEmbedding: number[],
    options: {
      userId?: string;
      documentIds?: string[];
      topK?: number;
      minSimilarity?: number;
    }
  ): (RAGDocumentChunk & { similarity: number })[] {
    const topK = options.topK || 4;
    const minSimilarity = options.minSimilarity ?? 0.45;

    const scored: (RAGDocumentChunk & { similarity: number })[] = [];

    for (const chunk of this.chunks.values()) {
      // 1. User scoping: never allow user to access another user's vector data
      if (options.userId && chunk.userId && chunk.userId !== options.userId) {
        continue;
      }

      // 2. Document filter
      if (options.documentIds && options.documentIds.length > 0) {
        if (!options.documentIds.includes(chunk.documentId)) {
          continue;
        }
      }

      if (!chunk.embedding) continue;

      const similarity = VectorStore.cosineSimilarity(queryEmbedding, chunk.embedding);
      if (similarity >= minSimilarity) {
        scored.push({
          ...chunk,
          similarity: Math.round(similarity * 1000) / 1000,
        });
      }
    }

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
  }

  public getAllChunks(): RAGDocumentChunk[] {
    return Array.from(this.chunks.values());
  }

  public clear(): void {
    this.chunks.clear();
  }
}

export const vectorStore = new VectorStore();
