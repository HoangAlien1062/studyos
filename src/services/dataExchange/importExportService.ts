import { Flashcard } from '../../types/flashcard';
import { MistakeItem } from '../../types/mistake';
import { QuestionItem } from '../../types/question';

export interface ImportValidationResult<T> {
  totalRead: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  errors: { row: number; reason: string }[];
  validItems: T[];
}

export class ImportExportService {
  // === FLASHCARD IMPORT / EXPORT ===

  exportFlashcardsJSON(cards: Flashcard[]): string {
    return JSON.stringify(cards, null, 2);
  }

  exportFlashcardsCSV(cards: Flashcard[]): string {
    const headers = ['id', 'front', 'back', 'hint', 'state', 'difficulty', 'repetitionCount', 'intervalDays', 'nextReviewDate'];
    const rows = cards.map(c => [
      c.id,
      this.escapeCSV(c.front),
      this.escapeCSV(c.back),
      this.escapeCSV(c.hint || ''),
      c.state,
      c.difficulty || 'medium',
      c.repetitionCount,
      c.intervalDays,
      c.nextReviewDate,
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  validateFlashcardsJSON(jsonContent: string, existingCards: Flashcard[] = []): ImportValidationResult<Flashcard> {
    const existingIds = new Set(existingCards.map(c => c.id));
    const errors: { row: number; reason: string }[] = [];
    const validItems: Flashcard[] = [];
    let duplicateCount = 0;

    let parsed: any[];
    try {
      parsed = JSON.parse(jsonContent);
      if (!Array.isArray(parsed)) {
        return { totalRead: 0, validCount: 0, invalidCount: 1, duplicateCount: 0, errors: [{ row: 1, reason: 'Dữ liệu JSON phải là một mảng danh sách thẻ (Array).' }], validItems: [] };
      }
    } catch {
      return { totalRead: 0, validCount: 0, invalidCount: 1, duplicateCount: 0, errors: [{ row: 1, reason: 'Định dạng JSON không hợp lệ (lỗi cú pháp).' }], validItems: [] };
    }

    parsed.forEach((item, idx) => {
      const row = idx + 1;
      if (!item.front || typeof item.front !== 'string' || item.front.trim().length === 0) {
        errors.push({ row, reason: 'Thiếu nội dung mặt trước (front).' });
        return;
      }
      if (!item.back || typeof item.back !== 'string' || item.back.trim().length === 0) {
        errors.push({ row, reason: 'Thiếu nội dung mặt sau (back).' });
        return;
      }

      const id = item.id || `card-${Date.now()}-${idx}`;
      if (existingIds.has(id)) {
        duplicateCount += 1;
      }

      validItems.push({
        id,
        deckId: item.deckId || 'default',
        front: item.front.trim(),
        back: item.back.trim(),
        hint: item.hint?.trim() || undefined,
        difficulty: item.difficulty || 'medium',
        state: item.state || 'new',
        repetitionCount: Number(item.repetitionCount) || 0,
        intervalDays: Number(item.intervalDays) || 0,
        nextReviewDate: item.nextReviewDate || new Date().toISOString().slice(0, 10),
      });
    });

    return {
      totalRead: parsed.length,
      validCount: validItems.length,
      invalidCount: errors.length,
      duplicateCount,
      errors,
      validItems,
    };
  }

  validateFlashcardsCSV(csvContent: string, existingCards: Flashcard[] = []): ImportValidationResult<Flashcard> {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      return { totalRead: 0, validCount: 0, invalidCount: 1, duplicateCount: 0, errors: [{ row: 1, reason: 'Tệp CSV trống hoặc không có dòng tiêu đề.' }], validItems: [] };
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const frontIdx = headers.indexOf('front');
    const backIdx = headers.indexOf('back');

    if (frontIdx === -1 || backIdx === -1) {
      return { totalRead: 0, validCount: 0, invalidCount: 1, duplicateCount: 0, errors: [{ row: 1, reason: 'Tệp CSV thiếu cột bắt buộc "front" hoặc "back".' }], validItems: [] };
    }

    const hintIdx = headers.indexOf('hint');
    const diffIdx = headers.indexOf('difficulty');

    const validItems: Flashcard[] = [];
    const errors: { row: number; reason: string }[] = [];
    let duplicateCount = 0;
    const existingFronts = new Set(existingCards.map(c => c.front.toLowerCase()));

    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCSVLine(lines[i]);
      const row = i + 1;
      const front = cols[frontIdx]?.trim();
      const back = cols[backIdx]?.trim();

      if (!front) {
        errors.push({ row, reason: 'Dòng thiếu nội dung mặt trước (front).' });
        continue;
      }
      if (!back) {
        errors.push({ row, reason: 'Dòng thiếu nội dung mặt sau (back).' });
        continue;
      }

      if (existingFronts.has(front.toLowerCase())) {
        duplicateCount += 1;
      }

      validItems.push({
        id: `card-${Date.now()}-${i}`,
        deckId: 'default',
        front,
        back,
        hint: hintIdx !== -1 ? cols[hintIdx]?.trim() : undefined,
        difficulty: (diffIdx !== -1 && cols[diffIdx]?.trim()) as any || 'medium',
        state: 'new',
        repetitionCount: 0,
        intervalDays: 0,
        nextReviewDate: new Date().toISOString().slice(0, 10),
      });
    }

    return {
      totalRead: lines.length - 1,
      validCount: validItems.length,
      invalidCount: errors.length,
      duplicateCount,
      errors,
      validItems,
    };
  }

  // === QUESTION IMPORT / EXPORT ===

  exportQuestionsJSON(questions: QuestionItem[]): string {
    return JSON.stringify(questions, null, 2);
  }

  exportQuestionsCSV(questions: QuestionItem[]): string {
    const headers = ['content', 'type', 'difficulty', 'correctOptionId', 'optionA', 'optionB', 'optionC', 'optionD', 'explanation', 'tags'];
    const rows = questions.map(q => {
      const optA = q.options.find(o => o.id === 'opt-1' || o.id === 'a')?.text || q.options[0]?.text || '';
      const optB = q.options.find(o => o.id === 'opt-2' || o.id === 'b')?.text || q.options[1]?.text || '';
      const optC = q.options.find(o => o.id === 'opt-3' || o.id === 'c')?.text || q.options[2]?.text || '';
      const optD = q.options.find(o => o.id === 'opt-4' || o.id === 'd')?.text || q.options[3]?.text || '';

      return [
        this.escapeCSV(q.content),
        q.type,
        q.difficulty,
        q.correctOptionId,
        this.escapeCSV(optA),
        this.escapeCSV(optB),
        this.escapeCSV(optC),
        this.escapeCSV(optD),
        this.escapeCSV(q.explanation || ''),
        this.escapeCSV((q.tags || []).join(';')),
      ];
    });

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  validateQuestionsJSON(jsonContent: string, subjectId: string): ImportValidationResult<QuestionItem> {
    const errors: { row: number; reason: string }[] = [];
    const validItems: QuestionItem[] = [];

    let parsed: any[];
    try {
      parsed = JSON.parse(jsonContent);
      if (!Array.isArray(parsed)) {
        return { totalRead: 0, validCount: 0, invalidCount: 1, duplicateCount: 0, errors: [{ row: 1, reason: 'Dữ liệu JSON phải là một mảng danh sách câu hỏi.' }], validItems: [] };
      }
    } catch {
      return { totalRead: 0, validCount: 0, invalidCount: 1, duplicateCount: 0, errors: [{ row: 1, reason: 'Cú pháp tệp JSON không hợp lệ.' }], validItems: [] };
    }

    parsed.forEach((item, idx) => {
      const row = idx + 1;
      if (!item.content || typeof item.content !== 'string' || item.content.trim().length === 0) {
        errors.push({ row, reason: 'Thiếu nội dung câu hỏi (content).' });
        return;
      }
      if (!item.options || !Array.isArray(item.options) || item.options.length < 2) {
        errors.push({ row, reason: 'Câu hỏi phải có mảng options chứa ít nhất 2 phương án.' });
        return;
      }
      if (!item.correctOptionId) {
        errors.push({ row, reason: 'Thiếu ID đáp án đúng (correctOptionId).' });
        return;
      }

      validItems.push({
        id: item.id || `q-${Date.now()}-${idx}`,
        content: item.content.trim(),
        options: item.options,
        correctOptionId: item.correctOptionId,
        correctOptionIds: item.correctOptionIds || [item.correctOptionId],
        explanation: item.explanation || '',
        subjectId: item.subjectId || subjectId,
        chapterId: item.chapterId,
        topicId: item.topicId,
        difficulty: item.difficulty || 'medium',
        type: item.type || 'single_choice',
        tags: Array.isArray(item.tags) ? item.tags : [],
        createdAt: new Date().toISOString(),
      });
    });

    return {
      totalRead: parsed.length,
      validCount: validItems.length,
      invalidCount: errors.length,
      duplicateCount: 0,
      errors,
      validItems,
    };
  }

  // === MISTAKES EXPORT ===
  exportMistakesJSON(mistakes: MistakeItem[]): string {
    return JSON.stringify(mistakes, null, 2);
  }

  // === CSV HELPERS ===
  private escapeCSV(text: string): string {
    if (text.includes(',') || text.includes('\n') || text.includes('"')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }
}

export const importExportService = new ImportExportService();
