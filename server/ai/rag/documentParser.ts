/**
 * Robust Multi-Format Document Text Extractor for StudyOS RAG
 * Supports: PDF, DOCX, PPTX, TXT, MD without native C++ compilation dependencies.
 */

import zlib from 'node:zlib';
import { cleanDocumentText } from './cleaner';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ParsedDocument {
  text: string;
  pages: ExtractedPage[];
  totalWordCount: number;
}

export class DocumentParser {
  /**
   * Parse document buffer based on file extension
   */
  public async parse(buffer: Buffer, fileType: string): Promise<ParsedDocument> {
    const ext = fileType.toLowerCase().replace(/^\./, '');

    switch (ext) {
      case 'txt':
      case 'md':
      case 'markdown':
        return this.parsePlainText(buffer);

      case 'pdf':
        return this.parsePDF(buffer);

      case 'docx':
        return this.parseDOCX(buffer);

      case 'pptx':
        return this.parsePPTX(buffer);

      default:
        // Try fallback plain text
        return this.parsePlainText(buffer);
    }
  }

  // === 1. PLAIN TEXT & MARKDOWN ===
  private parsePlainText(buffer: Buffer): ParsedDocument {
    const text = cleanDocumentText(buffer.toString('utf-8'));
    return {
      text,
      pages: [{ pageNumber: 1, text }],
      totalWordCount: text.split(/\s+/).filter(Boolean).length,
    };
  }

  // === 2. PDF PARSER ===
  private parsePDF(buffer: Buffer): ParsedDocument {
    const pdfStr = buffer.toString('binary');
    const pages: ExtractedPage[] = [];
    let aggregatedText = '';

    // Split loosely by page marker /Type\s*\/Page\b or stream
    const pageChunks = pdfStr.split(/\/Type\s*\/Page\b/i);

    let pageNum = 1;
    for (let i = 1; i < pageChunks.length; i++) {
      const chunk = pageChunks[i];
      const pageText = this.extractStreamsFromPdfChunk(Buffer.from(chunk, 'binary'));
      if (pageText.trim().length > 0) {
        pages.push({ pageNumber: pageNum, text: pageText });
        aggregatedText += (aggregatedText ? '\n\n' : '') + pageText;
        pageNum++;
      }
    }

    // Fallback if page splitting found nothing
    if (pages.length === 0) {
      const fullText = this.extractStreamsFromPdfChunk(buffer);
      if (fullText.trim().length > 0) {
        pages.push({ pageNumber: 1, text: fullText });
        aggregatedText = fullText;
      } else {
        // Last resort: extract visible ASCII/Unicode strings
        const asciiOnly = pdfStr.replace(/[^ -~\n\r\t]/g, ' ');
        const cleaned = cleanDocumentText(asciiOnly);
        pages.push({ pageNumber: 1, text: cleaned });
        aggregatedText = cleaned;
      }
    }

    return {
      text: cleanDocumentText(aggregatedText),
      pages,
      totalWordCount: aggregatedText.split(/\s+/).filter(Boolean).length,
    };
  }

  private extractStreamsFromPdfChunk(buf: Buffer): string {
    let result = '';
    const bufStr = buf.toString('binary');
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;

    while ((match = streamRegex.exec(bufStr)) !== null) {
      const rawStream = Buffer.from(match[1], 'binary');
      let decompressed: Buffer | null = null;

      try {
        decompressed = zlib.inflateSync(rawStream);
      } catch {
        try {
          decompressed = zlib.inflateRawSync(rawStream);
        } catch {
          decompressed = rawStream;
        }
      }

      if (decompressed) {
        const streamText = decompressed.toString('utf-8');
        // Extract text from PDF operators: (Text) Tj, [(T1) (T2)] TJ, 'string'
        const tjMatches = streamText.matchAll(/\(([^)]+)\)\s*Tj/g);
        for (const m of tjMatches) {
          result += ' ' + m[1];
        }

        const bigTjMatches = streamText.matchAll(/\[(.*?)\]\s*TJ/g);
        for (const m of bigTjMatches) {
          const innerTj = m[1].matchAll(/\(([^)]+)\)/g);
          for (const im of innerTj) {
            result += im[1];
          }
          result += ' ';
        }
      }
    }

    return cleanDocumentText(result);
  }

  // === 3. DOCX PARSER ===
  private parseDOCX(buffer: Buffer): ParsedDocument {
    try {
      // Find and extract word/document.xml from ZIP structure
      const xmlContent = this.extractFileFromZip(buffer, 'word/document.xml');
      if (!xmlContent) {
        return this.parsePlainText(buffer);
      }

      // Extract all text inside <w:t> tags
      let fullText = '';
      const pMatches = xmlContent.split(/<\/w:p>/g);

      for (const p of pMatches) {
        let pText = '';
        const tMatches = p.matchAll(/<w:t[^>]*>(.*?)<\/w:t>/g);
        for (const tm of tMatches) {
          pText += tm[1];
        }
        if (pText.trim().length > 0) {
          fullText += pText + '\n';
        }
      }

      const cleaned = cleanDocumentText(fullText);
      return {
        text: cleaned,
        pages: [{ pageNumber: 1, text: cleaned }],
        totalWordCount: cleaned.split(/\s+/).filter(Boolean).length,
      };
    } catch {
      return this.parsePlainText(buffer);
    }
  }

  // === 4. PPTX PARSER ===
  private parsePPTX(buffer: Buffer): ParsedDocument {
    try {
      const pages: ExtractedPage[] = [];
      let aggregatedText = '';
      let slideIndex = 1;

      while (slideIndex <= 100) {
        const slideXml = this.extractFileFromZip(buffer, `ppt/slides/slide${slideIndex}.xml`);
        if (!slideXml) break;

        let slideText = '';
        const tMatches = slideXml.matchAll(/<a:t>(.*?)<\/a:t>/g);
        for (const tm of tMatches) {
          slideText += ' ' + tm[1];
        }

        const cleanedSlide = cleanDocumentText(slideText);
        if (cleanedSlide.length > 0) {
          pages.push({ pageNumber: slideIndex, text: cleanedSlide });
          aggregatedText += (aggregatedText ? '\n\n' : '') + cleanedSlide;
        }
        slideIndex++;
      }

      if (pages.length === 0) {
        return this.parsePlainText(buffer);
      }

      const cleaned = cleanDocumentText(aggregatedText);
      return {
        text: cleaned,
        pages,
        totalWordCount: cleaned.split(/\s+/).filter(Boolean).length,
      };
    } catch {
      return this.parsePlainText(buffer);
    }
  }

  /**
   * Minimalist Pure JS ZIP File Entry Extractor
   */
  private extractFileFromZip(buffer: Buffer, targetFileName: string): string | null {
    let offset = 0;
    const len = buffer.length;

    while (offset < len - 4) {
      // Local File Header Signature: 0x04034b50 (PK\x03\x04)
      if (buffer.readUInt32LE(offset) === 0x04034b50) {
        const compressionMethod = buffer.readUInt16LE(offset + 8);
        const compressedSize = buffer.readUInt32LE(offset + 18);
        const fileNameLength = buffer.readUInt16LE(offset + 26);
        const extraFieldLength = buffer.readUInt16LE(offset + 28);

        const fileNameStart = offset + 30;
        const fileName = buffer.toString('utf-8', fileNameStart, fileNameStart + fileNameLength);

        const fileDataStart = fileNameStart + fileNameLength + extraFieldLength;

        if (fileName === targetFileName) {
          const compressedData = buffer.subarray(fileDataStart, fileDataStart + compressedSize);
          if (compressionMethod === 0) {
            // Uncompressed
            return compressedData.toString('utf-8');
          } else if (compressionMethod === 8) {
            // Deflated
            try {
              const inflated = zlib.inflateRawSync(compressedData);
              return inflated.toString('utf-8');
            } catch {
              return null;
            }
          }
        }

        offset = fileDataStart + compressedSize;
      } else {
        offset++;
      }
    }

    return null;
  }
}

export const documentParser = new DocumentParser();
