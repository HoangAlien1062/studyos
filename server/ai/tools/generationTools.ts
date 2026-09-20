/**
 * AI Generation Draft Tools for StudyOS (Part 4)
 * Generates structured study material drafts with MANDATORY USER CONFIRMATION.
 * AI CANNOT auto-save or delete database records directly!
 */

import { ToolDefinition } from '../types';

export const GENERATION_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'draftFlashcards',
    description: 'Đề xuất tạo danh sách thẻ ghi nhớ Flashcard từ một chủ đề hoặc đoạn tài liệu. Kết quả sẽ được đưa vào Màn hình Xem trước để người dùng xác nhận.',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Chủ đề của bộ thẻ flashcard' },
        items: {
          type: 'array',
          description: 'Danh sách các thẻ flashcard dự thảo',
        },
      },
      required: ['topic', 'items'],
    },
  },
  {
    name: 'draftQuestions',
    description: 'Đề xuất tạo danh sách câu hỏi trắc nghiệm kèm giải thích chi tiết từ tài liệu hoặc chủ đề học tập. Người dùng sẽ xem trước và duyệt trước khi lưu.',
    parameters: {
      type: 'object',
      properties: {
        subjectName: { type: 'string', description: 'Tên môn học' },
        questions: {
          type: 'array',
          description: 'Danh sách câu hỏi dự thảo',
        },
      },
      required: ['questions'],
    },
  },
  {
    name: 'draftNote',
    description: 'Đề xuất tạo một bản ghi chú học tập Markdown có cấu trúc, công thức KaTeX và code block.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Tiêu đề ghi chú' },
        contentMarkdown: { type: 'string', description: 'Nội dung ghi chú Markdown' },
        tags: { type: 'array', description: 'Các nhãn phân loại' },
      },
      required: ['title', 'contentMarkdown'],
    },
  },
];

export interface GeneratedFlashcardDraft {
  front: string;
  back: string;
  hint?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface GeneratedQuestionDraft {
  content: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  type?: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer';
}

export interface GeneratedNoteDraft {
  title: string;
  contentMarkdown: string;
  tags?: string[];
}
