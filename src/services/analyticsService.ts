import { AnalyticsSummary } from '../types/analytics';
import { statisticsEngine } from './algorithms/statisticsEngine';
import { documentService } from './documentService';
import { examService } from './examService';
import { flashcardService } from './flashcardService';
import { mistakeService } from './mistakeService';
import { noteService } from './noteService';
import { sessionService } from './sessionService';
import { subjectService } from './subjectService';

export const analyticsService = {
  /**
   * Tổng hợp toàn bộ số liệu thống kê học tập dựa trên 100% dữ liệu thực tế
   */
  async getSummary(): Promise<AnalyticsSummary> {
    const [
      subjects,
      topics,
      cards,
      mistakes,
      exams,
      attempts,
      sessions,
      docs,
      notes,
    ] = await Promise.all([
      subjectService.getSubjects(),
      subjectService.getTopics(),
      flashcardService.getCards(),
      mistakeService.getMistakes(),
      examService.getExams(),
      sessionService.getAttempts(),
      sessionService.getSessions(),
      documentService.getAllDocuments(),
      noteService.getAllNotes(),
    ]);

    return statisticsEngine.calculateSummary({
      subjects,
      topics,
      flashcards: cards,
      mistakes,
      exams,
      attempts,
      sessions,
      documentsCount: docs.filter(d => d.type !== 'folder').length,
      notesCount: notes.length,
    });
  },
};
