/**
 * Text Cleaning and Normalization for StudyOS RAG Pipeline
 */

export function cleanDocumentText(rawText: string): string {
  if (!rawText) return '';

  return (
    rawText
      // Replace null and non-printable control characters (except newline \n and tab \t)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Collapse excessive blank lines
      .replace(/\n{3,}/g, '\n\n')
      // Collapse multiple horizontal spaces
      .replace(/[ \t]+/g, ' ')
      // Normalize Unicode characters to NFC
      .normalize('NFC')
      .trim()
  );
}

/**
 * Extract simple section/chapter headings from text
 */
export function detectSectionTitle(chunkText: string): string | undefined {
  const headingMatch = chunkText.match(/^(#{1,4}|Chương \d+|Mục \d+(\.\d+)*|Bài \d+|Phần \d+)[^\n]+/im);
  if (headingMatch) {
    return headingMatch[0].replace(/^#+\s*/, '').trim();
  }
  return undefined;
}
