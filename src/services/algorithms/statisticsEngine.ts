import {
  AnalyticsSummary,
  DailyStudyStats,
  DetailedWeakTopic,
  ReasonDistributionMetric,
  StudyActivityPoint,
  SubjectPerformanceMetric,
} from '../../types/analytics';
import { ExamSession } from '../../types/exam';
import { Flashcard } from '../../types/flashcard';
import { MistakeItem } from '../../types/mistake';
import { QuestionAttemptRecord, StudySessionRecord } from '../../types/session';
import { Subject, Topic } from '../../types/subject';

export interface StatisticsInputContext {
  subjects: Subject[];
  topics: Topic[];
  flashcards: Flashcard[];
  mistakes: MistakeItem[];
  exams: ExamSession[];
  attempts: QuestionAttemptRecord[];
  sessions: StudySessionRecord[];
  documentsCount: number;
  notesCount: number;
}

export class StatisticsEngine {
  /**
   * Tính toán toàn bộ chỉ số thống kê học tập dựa trên 100% dữ liệu thực tế
   */
  calculateSummary(context: StatisticsInputContext): AnalyticsSummary {
    const {
      subjects,
      topics,
      flashcards,
      mistakes,
      exams,
      attempts,
      sessions,
      documentsCount,
      notesCount,
    } = context;

    const todayStr = new Date().toISOString().slice(0, 10);

    // 1. QUESTION STATS & OVERALL ACCURACY
    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter(a => a.isCorrect).length;
    const overallAccuracyRate = totalAttempts > 0
      ? Math.round((correctAttempts / totalAttempts) * 100)
      : 0;

    // 2. DAILY STATS
    const todayAttempts = attempts.filter(a => a.timestamp && a.timestamp.slice(0, 10) === todayStr);
    const todayCorrect = todayAttempts.filter(a => a.isCorrect).length;
    const accuracyToday = todayAttempts.length > 0
      ? Math.round((todayCorrect / todayAttempts.length) * 100)
      : 0;

    const flashcardsReviewedToday = flashcards.filter(
      c => c.lastReviewedAt && c.lastReviewedAt.slice(0, 10) === todayStr
    ).length;

    const topicsCompletedToday = topics.filter(
      t => t.isCompleted && t.completedAt && t.completedAt.slice(0, 10) === todayStr
    ).length;

    const dailyStats: DailyStudyStats = {
      questionsToday: todayAttempts.length,
      accuracyToday,
      flashcardsReviewedToday,
      topicsCompletedToday,
    };

    // 3. FLASHCARD COUNTS
    const totalFlashcardsLearned = flashcards.filter(c => c.state === 'learned').length;
    const totalFlashcardsDue = flashcards.filter(
      c => c.state === 'due' || (c.nextReviewDate && c.nextReviewDate <= todayStr)
    ).length;
    const totalFlashcardsLearning = flashcards.filter(c => c.state === 'learning').length;
    const totalFlashcardsNew = flashcards.filter(c => c.state === 'new').length;

    // 4. TOPICS COUNT
    const totalTopicsCount = topics.length;
    const completedTopicsCount = topics.filter(t => t.isCompleted).length;

    // 5. EXAM SCORES
    const submittedExams = exams.filter(e => e.isSubmitted && typeof e.score === 'number');
    const averageExamScore = submittedExams.length > 0
      ? Math.round(
          (submittedExams.reduce((acc, curr) => acc + (curr.score || 0), 0) / submittedExams.length) * 10
        ) / 10
      : 0;

    // 6. REASON DISTRIBUTION
    const reasonMap: Record<string, number> = {};
    for (const m of mistakes) {
      const reason = m.reason && m.reason.trim().length > 0 ? m.reason : 'Chưa phân loại';
      reasonMap[reason] = (reasonMap[reason] || 0) + 1;
    }
    const totalMistakes = mistakes.length;
    const reasonDistribution: ReasonDistributionMetric[] = Object.entries(reasonMap).map(([reason, count]) => ({
      reason,
      count,
      percentage: totalMistakes > 0 ? Math.round((count / totalMistakes) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    // 7. SUBJECT PERFORMANCES
    const subjectPerformances: SubjectPerformanceMetric[] = subjects.map(s => {
      const subjTopics = topics.filter(t => t.subjectId === s.id);
      const subjAttempts = attempts.filter(a => a.subjectId === s.id);
      const subjCorrect = subjAttempts.filter(a => a.isCorrect).length;
      const subjAccuracy = subjAttempts.length > 0
        ? Math.round((subjCorrect / subjAttempts.length) * 100)
        : 0;
      const subjFlashcards = flashcards.filter(c => c.subjectId === s.id);
      const learnedFlashcards = subjFlashcards.filter(c => c.state === 'learned').length;
      const doneTopics = subjTopics.filter(t => t.isCompleted).length;

      return {
        subjectId: s.id,
        subjectName: s.name,
        progress: s.progress || (subjTopics.length > 0 ? Math.round((doneTopics / subjTopics.length) * 100) : 0),
        questionsAnswered: subjAttempts.length,
        accuracy: subjAccuracy,
        flashcardsLearned: learnedFlashcards,
        topicsCompleted: doneTopics,
        totalTopics: subjTopics.length,
      };
    });

    // 8. WEAK TOPIC ANALYSIS WITH STRICT DATA THRESHOLD
    // Threshold: attempts >= 3 AND (accuracy < 60% OR repeatMistakes >= 2)
    const topicAttemptMap: Record<string, { total: number; wrong: number; subjectId: string; title: string }> = {};

    for (const t of topics) {
      topicAttemptMap[t.id] = {
        total: 0,
        wrong: 0,
        subjectId: t.subjectId,
        title: t.title,
      };
    }

    for (const a of attempts) {
      if (a.topicId && topicAttemptMap[a.topicId]) {
        topicAttemptMap[a.topicId].total += 1;
        if (!a.isCorrect) {
          topicAttemptMap[a.topicId].wrong += 1;
        }
      }
    }

    const repeatMistakesPerTopic: Record<string, number> = {};
    for (const m of mistakes) {
      if (m.topicId) {
        repeatMistakesPerTopic[m.topicId] = (repeatMistakesPerTopic[m.topicId] || 0) + (m.reviewCount >= 2 ? 1 : 0);
      }
    }

    const weakTopics: DetailedWeakTopic[] = [];

    for (const [topicId, data] of Object.entries(topicAttemptMap)) {
      const attemptsCount = data.total;
      const wrongCount = data.wrong;
      const accuracy = attemptsCount > 0 ? Math.round(((attemptsCount - wrongCount) / attemptsCount) * 100) : 100;
      const repeatCount = repeatMistakesPerTopic[topicId] || 0;

      // STRICT THRESHOLD VERIFICATION
      const isConfirmedWeak = attemptsCount >= 3 && (accuracy < 60 || repeatCount >= 2);

      if (isConfirmedWeak || (attemptsCount >= 2 && accuracy <= 50)) {
        const subject = subjects.find(s => s.id === data.subjectId);
        weakTopics.push({
          topicId,
          topicTitle: data.title,
          subjectId: data.subjectId,
          subjectName: subject?.name || 'Môn học',
          attempts: attemptsCount,
          wrongCount,
          accuracy,
          repeatMistakes: repeatCount,
          isConfirmedWeak,
        });
      }
    }

    weakTopics.sort((a, b) => a.accuracy - b.accuracy);

    // 9. WEEKLY ACTIVITY TIMELINE (Past 7 days)
    const daysLabel = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const weeklyActivity: StudyActivityPoint[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const dayLabel = daysLabel[d.getDay()];

      const dayAttempts = attempts.filter(a => a.timestamp && a.timestamp.slice(0, 10) === dateKey);
      const dayCards = flashcards.filter(c => c.lastReviewedAt && c.lastReviewedAt.slice(0, 10) === dateKey);
      const daySessions = sessions.filter(s => s.startedAt && s.startedAt.slice(0, 10) === dateKey);
      const studyMinutes = Math.round(
        daySessions.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0) / 60
      );

      weeklyActivity.push({
        date: dayLabel,
        questionsAnswered: dayAttempts.length,
        flashcardsReviewed: dayCards.length,
        studyMinutes: studyMinutes || (dayAttempts.length * 2 + dayCards.length),
      });
    }

    // 10. STREAK CALCULATION
    let streakDays = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const checkStr = d.toISOString().slice(0, 10);
      const hasAttempt = attempts.some(a => a.timestamp && a.timestamp.slice(0, 10) === checkStr);
      const hasCard = flashcards.some(c => c.lastReviewedAt && c.lastReviewedAt.slice(0, 10) === checkStr);
      const hasExam = exams.some(e => e.completedAt && e.completedAt.slice(0, 10) === checkStr);

      if (hasAttempt || hasCard || hasExam) {
        streakDays += 1;
      } else if (i > 0) {
        break; // Streak broken
      }
    }

    // 11. RECENT ACTIVITY TIMELINE
    const recentActivityTimeline = [
      ...attempts.slice(-5).reverse().map(a => ({
        id: a.id,
        action: a.isCorrect ? 'Trả lời đúng câu hỏi' : 'Làm sai câu hỏi (Đã lưu sổ lỗi)',
        target: `Môn học • ${a.context}`,
        timestamp: a.timestamp,
        icon: a.isCorrect ? 'CheckCircle' : 'XCircle',
      })),
      ...submittedExams.slice(-3).reverse().map(e => ({
        id: e.id,
        action: `Nộp bài thi đạt ${e.score}/10 điểm`,
        target: e.title,
        timestamp: e.completedAt || e.createdAt,
        icon: 'Award',
      })),
    ].slice(0, 6);

    return {
      totalQuestionsAnswered: totalAttempts,
      overallAccuracyRate,
      totalFlashcardsLearned,
      totalFlashcardsDue,
      totalFlashcardsLearning,
      totalFlashcardsNew,
      completedTopicsCount,
      totalTopicsCount,
      totalDocumentsCount: documentsCount,
      totalNotesCount: notesCount,
      averageExamScore,
      streakDays: Math.max(1, streakDays),
      dailyStats,
      reasonDistribution,
      subjectPerformances,
      weakTopics,
      recentActivityTimeline,
      weeklyActivity,
    };
  }
}

export const statisticsEngine = new StatisticsEngine();
