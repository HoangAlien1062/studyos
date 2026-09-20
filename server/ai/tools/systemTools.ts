/**
 * 13 Read-Only System Data Tools for StudyOS AI Engine (Part 4)
 * Scoped strictly to the current user's learning data.
 */

import { ToolDefinition } from '../types';

export const SYSTEM_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'searchDocuments',
    description: 'Tìm kiếm tài liệu học tập trong thư viện tài liệu của người dùng theo tên hoặc từ khóa.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Từ khóa tìm kiếm tài liệu' },
        fileType: { type: 'string', description: 'Loại tệp: pdf, docx, txt, md, pptx...' },
      },
      required: ['query'],
    },
  },
  {
    name: 'searchNotes',
    description: 'Tìm kiếm ghi chú học tập Markdown của người dùng theo tiêu đề hoặc nội dung.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Từ khóa tìm kiếm ghi chú' },
        tag: { type: 'string', description: 'Nhãn môn học hoặc chủ đề' },
      },
      required: ['query'],
    },
  },
  {
    name: 'searchFlashcards',
    description: 'Tìm kiếm thẻ flashcard trong các bộ thẻ ghi nhớ của người dùng.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Từ khóa trên mặt trước hoặc mặt sau' },
        state: { type: 'string', description: 'Trạng thái thẻ: new, learning, due, learned', enum: ['new', 'learning', 'due', 'learned'] },
      },
      required: ['query'],
    },
  },
  {
    name: 'searchQuestions',
    description: 'Tìm kiếm câu hỏi luyện tập trong Ngân hàng câu hỏi của người dùng.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Từ khóa trong nội dung câu hỏi' },
        difficulty: { type: 'string', description: 'Độ khó: easy, medium, hard' },
      },
      required: ['query'],
    },
  },
  {
    name: 'searchErrorBook',
    description: 'Tìm kiếm các câu hỏi làm sai trong Sổ lỗi sai (Error Logbook) kèm lý do sai và số lần lặp lại.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Từ khóa câu sai hoặc môn học' },
        reason: { type: 'string', description: 'Lý do làm sai' },
      },
    },
  },
  {
    name: 'searchConversations',
    description: 'Tìm kiếm lịch sử các cuộc hội thoại học tập trước đây với trợ lý AI.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Từ khóa trong tiêu đề cuộc hội thoại' },
      },
      required: ['query'],
    },
  },
  {
    name: 'getSubject',
    description: 'Lấy thông tin chi tiết một môn học theo ID hoặc Tên môn học.',
    parameters: {
      type: 'object',
      properties: {
        subjectIdOrName: { type: 'string', description: 'ID hoặc tên môn học (ví dụ: Giải tích 1)' },
      },
      required: ['subjectIdOrName'],
    },
  },
  {
    name: 'getChapter',
    description: 'Lấy danh sách các chủ đề và nội dung thuộc một chương học cụ thể.',
    parameters: {
      type: 'object',
      properties: {
        chapterId: { type: 'string', description: 'ID của chương học' },
      },
      required: ['chapterId'],
    },
  },
  {
    name: 'getTopic',
    description: 'Lấy thông tin một chủ đề học tập cụ thể, trạng thái hoàn thành và các tài liệu/câu hỏi liên kết.',
    parameters: {
      type: 'object',
      properties: {
        topicId: { type: 'string', description: 'ID của chủ đề' },
      },
      required: ['topicId'],
    },
  },
  {
    name: 'getSchedule',
    description: 'Lấy lịch học và thời khóa biểu trong tuần hoặc theo ngày cụ thể.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Ngày cần tra cứu dạng YYYY-MM-DD (mặc định hôm nay)' },
      },
    },
  },
  {
    name: 'getExam',
    description: 'Lấy thông tin cấu hình và danh sách câu hỏi của một đề thi.',
    parameters: {
      type: 'object',
      properties: {
        examId: { type: 'string', description: 'ID của bài thi' },
      },
      required: ['examId'],
    },
  },
  {
    name: 'getExamResult',
    description: 'Lấy kết quả chấm điểm, điểm số thang 10, câu sai và các chủ đề yếu sau khi thi.',
    parameters: {
      type: 'object',
      properties: {
        examIdOrAttemptId: { type: 'string', description: 'ID đề thi hoặc phiên thi' },
      },
      required: ['examIdOrAttemptId'],
    },
  },
  {
    name: 'getStudyStatistics',
    description: 'Lấy toàn bộ chỉ số thống kê học tập thực tế: số câu đã làm, độ chính xác, flashcards đến hạn, streak, phân bố lỗi sai, và các chủ đề yếu cần cải thiện.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
];

/**
 * System Data Tools Executor
 * In server-side execution, interacts with user's repository/context
 */
export class SystemToolsExecutor {
  public async executeTool(
    name: string,
    args: Record<string, any>,
    userContext: {
      documents?: any[];
      notes?: any[];
      flashcards?: any[];
      questions?: any[];
      mistakes?: any[];
      conversations?: any[];
      subjects?: any[];
      schedules?: any[];
      exams?: any[];
      statistics?: any;
    }
  ): Promise<any> {
    const q = (args.query || '').toLowerCase().trim();

    switch (name) {
      case 'searchDocuments': {
        const docs = userContext.documents || [];
        const filtered = docs.filter(d =>
          d.name.toLowerCase().includes(q) ||
          (args.fileType && d.type === args.fileType)
        ).slice(0, 5);
        return { count: filtered.length, documents: filtered };
      }

      case 'searchNotes': {
        const notes = userContext.notes || [];
        const filtered = notes.filter(n =>
          n.title.toLowerCase().includes(q) ||
          n.content_markdown?.toLowerCase().includes(q)
        ).slice(0, 5);
        return { count: filtered.length, notes: filtered };
      }

      case 'searchFlashcards': {
        const fcs = userContext.flashcards || [];
        const filtered = fcs.filter(c =>
          c.front.toLowerCase().includes(q) ||
          c.back.toLowerCase().includes(q)
        ).slice(0, 10);
        return { count: filtered.length, flashcards: filtered };
      }

      case 'searchQuestions': {
        const qs = userContext.questions || [];
        const filtered = qs.filter(item =>
          item.content.toLowerCase().includes(q)
        ).slice(0, 5);
        return { count: filtered.length, questions: filtered };
      }

      case 'searchErrorBook': {
        const mistakes = userContext.mistakes || [];
        const filtered = q
          ? mistakes.filter(m => m.questionContent?.toLowerCase().includes(q) || m.reason?.toLowerCase().includes(q))
          : mistakes;
        return { count: filtered.length, mistakes: filtered.slice(0, 10) };
      }

      case 'searchConversations': {
        const convs = userContext.conversations || [];
        const filtered = convs.filter(c => c.title.toLowerCase().includes(q)).slice(0, 5);
        return { count: filtered.length, conversations: filtered };
      }

      case 'getSubject': {
        const subjects = userContext.subjects || [];
        const target = subjects.find(s =>
          s.id === args.subjectIdOrName || s.name.toLowerCase().includes((args.subjectIdOrName || '').toLowerCase())
        );
        return target ? { found: true, subject: target } : { found: false, message: 'Không tìm thấy môn học' };
      }

      case 'getSchedule': {
        const schedules = userContext.schedules || [];
        return { count: schedules.length, schedules: schedules.slice(0, 10) };
      }

      case 'getExam':
      case 'getExamResult': {
        const exams = userContext.exams || [];
        const found = exams.find(e => e.id === (args.examId || args.examIdOrAttemptId));
        return found ? { found: true, exam: found } : { found: false, message: 'Không tìm thấy bài thi' };
      }

      case 'getStudyStatistics': {
        return userContext.statistics || { message: 'Chưa có đủ dữ liệu thống kê' };
      }

      default:
        return { error: `Công cụ ${name} không được hỗ trợ.` };
    }
  }
}

export const systemToolsExecutor = new SystemToolsExecutor();
