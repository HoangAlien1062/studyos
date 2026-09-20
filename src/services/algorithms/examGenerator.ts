import { ExamConfig, ExamSession } from '../../types/exam';
import { QuestionItem } from '../../types/question';

export interface ExamGenerationContext {
  allQuestions: QuestionItem[];
  recentQuestionIds?: string[];
  subjectName: string;
}

export class ExamGenerator {
  /**
   * Sinh đề thi dựa trên cấu hình ExamConfig và dữ liệu câu hỏi thật.
   * Tuyệt đối không sinh câu giả khi thiếu dữ liệu; ném lỗi cụ thể để UI hiển thị thông báo.
   */
  generate(config: ExamConfig, context: ExamGenerationContext): ExamSession {
    const { allQuestions, recentQuestionIds = [], subjectName } = context;

    // 1. Chế độ Chọn câu hỏi Thủ công (Manual Exam)
    if (config.mode === 'manual' && config.manualQuestionIds && config.manualQuestionIds.length > 0) {
      const selected = allQuestions.filter(q => config.manualQuestionIds!.includes(q.id));
      if (selected.length === 0) {
        throw new Error('Chưa chọn câu hỏi nào cho bài thi thủ công.');
      }
      return {
        id: `exam-${Date.now()}`,
        title: config.title || `Đề thi thủ công: ${subjectName}`,
        subjectId: config.subjectId,
        subjectName,
        durationMinutes: config.durationMinutes || 45,
        questions: selected,
        userAnswers: {},
        flaggedQuestionIds: [],
        isSubmitted: false,
        createdAt: new Date().toISOString(),
      };
    }

    // 2. Chế độ Sinh đề Ngẫu nhiên theo Tiêu chí (Random Exam)
    let pool = allQuestions.filter(q => q.subjectId === config.subjectId);

    // Lọc theo chương
    if (config.chapterIds && config.chapterIds.length > 0) {
      pool = pool.filter(q => q.chapterId && config.chapterIds.includes(q.chapterId));
    }

    // Lọc theo chủ đề
    if (config.topicIds && config.topicIds.length > 0) {
      pool = pool.filter(q => q.topicId && config.topicIds.includes(q.topicId));
    }

    // Lọc theo độ khó
    if (config.difficulty && config.difficulty !== 'mixed') {
      pool = pool.filter(q => q.difficulty === config.difficulty);
    }

    // Lọc theo loại câu hỏi
    if (config.questionType && config.questionType !== 'mixed') {
      pool = pool.filter(q => q.type === config.questionType);
    }

    // Lọc theo tags nếu có
    if (config.tags && config.tags.length > 0) {
      pool = pool.filter(q => q.tags && config.tags!.some(t => q.tags.includes(t)));
    }

    // Tránh câu hỏi đã làm gần đây nếu người dùng yêu cầu
    if (config.avoidRecentlyAttempted && recentQuestionIds.length > 0) {
      const freshPool = pool.filter(q => !recentQuestionIds.includes(q.id));
      // Chỉ áp dụng lọc nếu số câu còn lại vẫn đủ
      if (freshPool.length >= config.questionCount) {
        pool = freshPool;
      }
    }

    // KIỂM TRA NGHIÊM NGẶT SỐ LƯỢNG CÂU HỎI
    if (pool.length < config.questionCount) {
      throw new Error(
        `Không đủ câu hỏi theo tiêu chí yêu cầu trong Ngân hàng câu hỏi: ` +
        `Yêu cầu ${config.questionCount} câu nhưng chỉ tìm thấy ${pool.length} câu phù hợp. ` +
        `Vui lòng tạo thêm câu hỏi hoặc giảm số lượng câu cần tạo.`
      );
    }

    // Xáo trộn ngẫu nhiên (Fisher-Yates shuffle)
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selectedQuestions = shuffled.slice(0, config.questionCount);

    return {
      id: `exam-${Date.now()}`,
      title: config.title || `Đề thi: ${subjectName} (${selectedQuestions.length} câu)`,
      subjectId: config.subjectId,
      subjectName,
      durationMinutes: config.durationMinutes || 45,
      questions: selectedQuestions,
      userAnswers: {},
      flaggedQuestionIds: [],
      isSubmitted: false,
      createdAt: new Date().toISOString(),
    };
  }
}

export const examGenerator = new ExamGenerator();
