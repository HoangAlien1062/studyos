/**
 * RAG Orchestration Engine for StudyOS (Part 4)
 */

import { wrapUntrustedDocumentContext } from '../security';
import { RAGQueryResult, SourceCitation } from '../types';
import { documentChunker } from './chunker';
import { documentParser } from './documentParser';
import { vectorStore, VectorStore } from './vectorStore';

export interface IndexDocumentPayload {
  fileBuffer: Buffer;
  documentId: string;
  documentName: string;
  fileType: string;
  userId: string;
}

export class RAGEngine {
  /**
   * Complete Document Ingestion Pipeline:
   * Upload -> Extract -> Clean -> Semantic Chunk -> Embed -> Store
   */
  public async indexDocument(payload: IndexDocumentPayload): Promise<{
    chunkCount: number;
    wordCount: number;
    pageCount: number;
  }> {
    const { fileBuffer, documentId, documentName, fileType, userId } = payload;

    // 1. Extract text and pages
    const parsed = await documentParser.parse(fileBuffer, fileType);

    // 2. Semantic Chunking
    const chunks = documentChunker.chunk(parsed, {
      documentId,
      documentName,
      userId,
    });

    // 3. Clear any existing chunks for this document (idempotent re-indexing)
    vectorStore.deleteDocumentChunks(documentId);

    // 4. Generate embeddings (using fallback or vectorStore built-in generator)
    for (const chunk of chunks) {
      chunk.embedding = VectorStore.generateFallbackEmbedding(chunk.content);
    }

    // 5. Save to Vector Store
    vectorStore.addChunks(chunks);

    return {
      chunkCount: chunks.length,
      wordCount: parsed.totalWordCount,
      pageCount: parsed.pages.length,
    };
  }

  /**
   * Search relevant chunks and construct anti-injection RAG context
   */
  public async query(
    queryText: string,
    options: {
      userId?: string;
      documentIds?: string[];
      topK?: number;
      minSimilarity?: number;
    }
  ): Promise<RAGQueryResult> {
    if (!queryText || queryText.trim().length === 0) {
      return { chunks: [], augmentedContext: '', citations: [] };
    }

    // 1. Generate query embedding
    const queryEmbedding = VectorStore.generateFallbackEmbedding(queryText);

    // 2. Search Vector Store
    const matchedChunks = vectorStore.search(queryEmbedding, options);

    if (matchedChunks.length === 0) {
      return {
        chunks: [],
        augmentedContext: '',
        citations: [],
      };
    }

    // 3. Construct Citations and Protected Context
    const citations: SourceCitation[] = [];
    let augmentedContext = '';

    for (const chunk of matchedChunks) {
      const citation: SourceCitation = {
        documentId: chunk.documentId,
        documentName: chunk.documentName,
        page: chunk.pageNumber,
        section: chunk.sectionTitle,
        chunkIndex: chunk.chunkIndex,
        snippet: chunk.content.slice(0, 160) + (chunk.content.length > 160 ? '...' : ''),
        similarity: chunk.similarity,
      };
      citations.push(citation);

      // Enclose in security tags to prevent prompt injection
      const wrapped = wrapUntrustedDocumentContext(chunk.content, {
        documentName: chunk.documentName,
        page: chunk.pageNumber,
        section: chunk.sectionTitle,
      });

      augmentedContext += (augmentedContext ? '\n\n' : '') + wrapped;
    }

    return {
      chunks: matchedChunks,
      augmentedContext,
      citations,
    };
  }
}

export const ragEngine = new RAGEngine();
