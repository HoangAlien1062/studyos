/**
 * Semantic Document Chunker for StudyOS RAG Pipeline
 */

import { RAGDocumentChunk } from '../types';
import { detectSectionTitle } from './cleaner';
import { ParsedDocument } from './documentParser';

export interface ChunkingOptions {
  wordsPerChunk?: number; // default 400
  overlapWords?: number;  // default 50
}

export class DocumentChunker {
  private defaultWordsPerChunk = 400;
  private defaultOverlap = 50;

  /**
   * Split parsed document into indexed semantic chunks with metadata
   */
  public chunk(
    parsed: ParsedDocument,
    metadata: {
      documentId: string;
      documentName: string;
      userId: string;
    },
    options?: ChunkingOptions
  ): RAGDocumentChunk[] {
    const wordsPerChunk = options?.wordsPerChunk || this.defaultWordsPerChunk;
    const overlapWords = options?.overlapWords || this.defaultOverlap;

    const chunks: RAGDocumentChunk[] = [];
    let globalChunkIndex = 0;

    for (const page of parsed.pages) {
      const pageText = page.text.trim();
      if (!pageText) continue;

      const words = pageText.split(/\s+/).filter(Boolean);
      if (words.length <= wordsPerChunk) {
        // Entire page fits in one chunk
        const sectionTitle = detectSectionTitle(pageText);
        chunks.push({
          id: `chunk-${metadata.documentId}-${globalChunkIndex++}`,
          documentId: metadata.documentId,
          documentName: metadata.documentName,
          userId: metadata.userId,
          chunkIndex: globalChunkIndex,
          content: pageText,
          pageNumber: page.pageNumber,
          sectionTitle,
          tokenEstimate: Math.ceil(pageText.length / 3.5),
          createdAt: new Date().toISOString(),
        });
        continue;
      }

      // Slide window with overlap
      let startIdx = 0;
      while (startIdx < words.length) {
        const endIdx = Math.min(startIdx + wordsPerChunk, words.length);
        const chunkWords = words.slice(startIdx, endIdx);
        const chunkText = chunkWords.join(' ');
        const sectionTitle = detectSectionTitle(chunkText);

        chunks.push({
          id: `chunk-${metadata.documentId}-${globalChunkIndex++}`,
          documentId: metadata.documentId,
          documentName: metadata.documentName,
          userId: metadata.userId,
          chunkIndex: globalChunkIndex,
          content: chunkText,
          pageNumber: page.pageNumber,
          sectionTitle,
          tokenEstimate: Math.ceil(chunkText.length / 3.5),
          createdAt: new Date().toISOString(),
        });

        if (endIdx === words.length) break;
        startIdx += wordsPerChunk - overlapWords;
      }
    }

    return chunks;
  }
}

export const documentChunker = new DocumentChunker();
