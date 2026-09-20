import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  FileCheck,
  FileText,
  HelpCircle,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { useToast } from '../../context/ToastContext';
import { analyticsService } from '../../services/analyticsService';
import { documentService } from '../../services/documentService';
import { examService } from '../../services/examService';
import { flashcardService } from '../../services/flashcardService';
import { noteService } from '../../services/noteService';
import { scheduleService } from '../../services/scheduleService';
import { subjectService } from '../../services/subjectService';
import { AnalyticsSummary } from '../../types/analytics';
import { DocumentItem } from '../../types/document';
import { ExamSession } from '../../types/exam';
import { FlashcardDeck } from '../../types/flashcard';
import { NoteItem } from '../../types/note';
import { ScheduleEvent } from '../../types/schedule';
import { Subject } from '../../types/subject';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';

type WidgetState = 'normal' | 'loading' | 'empty' | 'error';

export const DashboardPage: React.FC = () => {
  const { navigateTo, dataVersion, triggerDataRefresh } = useStudy();
  const toast = useToast();

  const [widgetState, setWidgetState] = useState<WidgetState>('normal');
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [recentDocs, setRecentDocs] = useState<DocumentItem[]>([]);
  const [recentNotes, setRecentNotes] = useState<NoteItem[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [exams, setExams] = useState<ExamSession[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  const loadDashboardData = async () => {
    try {
      const [scList, subList, docList, noteList, deckList, examList, sum] = await Promise.all([
        scheduleService.getSchedules(),
        subjectService.getSubjects(),
        documentService.getAllDocuments(),
        noteService.getAllNotes(),
        flashcardService.getDecks(),
        examService.getExams(),
        analyticsService.getSummary(),
      ]);

      setSchedules(scList);
      setSubjects(subList);
      setRecentDocs(docList.filter(d => d.type !== 'folder').slice(0, 4));
      setRecentNotes(noteList.slice(0, 3));
      setDecks(deckList.slice(0, 3));
      setExams(examList);
      setSummary(sum);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [dataVersion]);

  // Đánh dấu hoàn thành tiết học trực tiếp từ dashboard
  const handleToggleSchedule = async (id: string) => {
    const updated = await scheduleService.toggleComplete(id);
    if (updated) {
      toast.success(
        updated.isCompleted ? 'Đã hoàn thành tiết học' : 'Đã bỏ hoàn thành tiết học',
        updated.subjectName
      );
      triggerDataRefresh();
    }
  };

  // Tiết học hôm nay
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySchedules = widgetState === 'empty' ? [] : schedules.filter(s => s.date === todayStr);

  // Tiết học sắp tới gần nhất (chưa hoàn thành)
  const upcomingClass = todaySchedules.find(s => !s.isCompleted) || schedules.find(s => !s.isCompleted);

  // Đề thi sắp tới
  const upcomingExams = widgetState === 'empty' ? [] : exams.slice(0, 2);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Chào Hoàng Long 👋
              </span>
              <Badge variant="primary" size="sm">
                Học kỳ I • 2026-2027
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Hôm nay bạn có <strong className="text-indigo-600 dark:text-indigo-400">{todaySchedules.length} tiết học</strong>,{' '}
              <strong className="text-amber-600 dark:text-amber-400">{summary?.totalFlashcardsDue ?? 0} thẻ flashcard</strong> cần ôn tập và {upcomingExams.length > 0 ? `${upcomingExams.length} đề thi` : 'chưa có đề thi mới'}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Calendar className="w-4 h-4" />}
              onClick={() => navigateTo('schedule')}
            >
              Lịch học
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Sparkles className="w-4 h-4" />}
              onClick={() => navigateTo('ai')}
            >
              Hỏi trợ lý AI
            </Button>
          </div>
        </div>

        {/* State Simulator Switcher for UX Testing */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-400 text-[11px] font-medium">
            Mô phỏng trạng thái widget (UX/UI Testing):
          </span>
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setWidgetState('normal')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                widgetState === 'normal'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Bình thường
            </button>
            <button
              type="button"
              onClick={() => setWidgetState('loading')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                widgetState === 'loading'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Loading Skeleton
            </button>
            <button
              type="button"
              onClick={() => setWidgetState('empty')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                widgetState === 'empty'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Empty State
            </button>
            <button
              type="button"
              onClick={() => setWidgetState('error')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                widgetState === 'error'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Error State
            </button>
          </div>
        </div>
      </div>

      {/* Global Error Simulation */}
      {widgetState === 'error' && (
        <ErrorState
          title="Không thể đồng bộ bảng tin Dashboard"
          message="Đã xảy ra lỗi khi nạp thông tin lịch học và thống kê bài tập. Vui lòng bấm thử lại."
          onRetry={() => setWidgetState('normal')}
        />
      )}

      {/* Quick Statistics Bar */}
      {widgetState === 'loading' ? (
        <LoadingSkeleton variant="card" count={4} />
      ) : widgetState !== 'error' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="!p-4 flex items-center gap-3 hoverable">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Số câu đã làm</p>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {widgetState === 'empty' ? 0 : summary?.totalQuestionsAnswered || 0}
              </h4>
            </div>
          </Card>

          <Card className="!p-4 flex items-center gap-3 hoverable">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Độ chính xác</p>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {widgetState === 'empty' ? '0%' : `${summary?.overallAccuracyRate || 0}%`}
              </h4>
            </div>
          </Card>

          <Card className="!p-4 flex items-center gap-3 hoverable">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Flashcard đã học</p>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {widgetState === 'empty' ? 0 : summary?.totalFlashcardsLearned || 0}
              </h4>
            </div>
          </Card>

          <Card className="!p-4 flex items-center gap-3 hoverable">
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Chủ đề hoàn thành</p>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {widgetState === 'empty' ? 0 : `${summary?.completedTopicsCount || 0}/${summary?.totalTopicsCount || 0}`}
              </h4>
            </div>
          </Card>
        </div>
      )}

      {/* Main Two-Column Grid */}
      {widgetState !== 'error' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Today's Schedule + Upcoming Class + Subject Progress */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Activity Banner */}
            {widgetState === 'loading' ? (
              <LoadingSkeleton variant="text" />
            ) : upcomingClass && widgetState !== 'empty' ? (
              <div className="p-4 rounded-2xl bg-indigo-600 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm shadow-indigo-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
                        Tiết học tiếp theo
                      </span>
                      <span className="px-2 py-0.2 rounded-full text-[10px] bg-white/20 text-white">
                        {upcomingClass.startTime} - {upcomingClass.endTime}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-0.5">
                      {upcomingClass.subjectName}
                    </h4>
                    <p className="text-xs text-indigo-100">
                      {upcomingClass.location} • GV: {upcomingClass.teacher}
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleToggleSchedule(upcomingClass.id)}
                  className="bg-white text-indigo-700 hover:bg-indigo-50 self-end sm:self-auto"
                >
                  Đánh dấu hoàn thành
                </Button>
              </div>
            ) : null}

            {/* Today's Schedule Card */}
            <Card
              title="Lịch học hôm nay"
              subtitle={new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
              extra={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateTo('schedule')}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Xem tuần
                </Button>
              }
            >
              {widgetState === 'loading' ? (
                <LoadingSkeleton variant="list" count={2} />
              ) : todaySchedules.length === 0 ? (
                <EmptyState
                  title="Hôm nay không có lịch học"
                  description="Bạn có thể tận dụng thời gian rảnh để ôn tập các bộ thẻ flashcard hoặc luyện đề thi."
                  action={
                    <Button variant="outline" size="sm" onClick={() => navigateTo('schedule')}>
                      Thêm lịch học mới
                    </Button>
                  }
                />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {todaySchedules.map(item => (
                    <div
                      key={item.id}
                      className="py-3 flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleSchedule(item.id)}
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors flex-shrink-0 ${
                            item.isCompleted
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'
                          }`}
                          aria-label={item.isCompleted ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
                        >
                          {item.isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <div className="min-w-0">
                          <h4
                            className={`text-xs font-semibold truncate ${
                              item.isCompleted
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {item.subjectName}
                          </h4>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                            {item.startTime} - {item.endTime} • {item.location}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant={item.isCompleted ? 'success' : 'primary'}
                        size="sm"
                      >
                        {item.isCompleted ? 'Đã học' : 'Sắp tới'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Subject Progress Card */}
            <Card
              title="Tiến độ môn học"
              subtitle="Cập nhật tự động theo các chủ đề bạn đã đánh dấu hoàn thành"
              extra={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateTo('subjects')}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Tất cả môn
                </Button>
              }
            >
              {widgetState === 'loading' ? (
                <LoadingSkeleton variant="list" count={3} />
              ) : subjects.length === 0 || widgetState === 'empty' ? (
                <EmptyState
                  title="Chưa có môn học nào"
                  description="Hãy tạo môn học đầu tiên để bắt đầu xây dựng chương trình học."
                  action={
                    <Button variant="primary" size="sm" onClick={() => navigateTo('subjects')}>
                      Thêm môn học
                    </Button>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {subjects.map(subj => (
                    <div
                      key={subj.id}
                      onClick={() => navigateTo('subjects', subj.id)}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer transition-all hover:shadow-xs group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: subj.color }}
                          />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors truncate">
                            {subj.name}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {subj.progress}%
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${subj.progress}%`,
                            backgroundColor: subj.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Notes & Documents Side by Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Recent Notes */}
              <Card
                title="Ghi chú gần đây"
                extra={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateTo('notes')}
                    className="text-xs"
                  >
                    Xem hết
                  </Button>
                }
              >
                {widgetState === 'loading' ? (
                  <LoadingSkeleton variant="text" />
                ) : recentNotes.length === 0 || widgetState === 'empty' ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Chưa có ghi chú nào
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {recentNotes.map(n => (
                      <div
                        key={n.id}
                        onClick={() => navigateTo('notes', n.id)}
                        className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Edit3 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <h5 className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">
                            {n.title}
                          </h5>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                          {n.tags.join(' • ')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Recent Documents */}
              <Card
                title="Tài liệu gần đây"
                extra={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateTo('documents')}
                    className="text-xs"
                  >
                    Mở tệp
                  </Button>
                }
              >
                {widgetState === 'loading' ? (
                  <LoadingSkeleton variant="text" />
                ) : recentDocs.length === 0 || widgetState === 'empty' ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Chưa có tài liệu nào
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {recentDocs.map(d => (
                      <div
                        key={d.id}
                        onClick={() => navigateTo('documents', d.id)}
                        className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <FileText className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {d.name}
                          </span>
                        </div>
                        <Badge size="sm" variant="neutral">
                          {d.type.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Right Column: Upcoming Exams + Due Flashcards + Recent Activity */}
          <div className="space-y-6">
            {/* Upcoming Exams Card */}
            <Card
              title="Đề thi sắp tới"
              extra={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateTo('exams')}
                  className="text-xs"
                >
                  Luyện đề
                </Button>
              }
            >
              {widgetState === 'loading' ? (
                <LoadingSkeleton variant="list" count={2} />
              ) : upcomingExams.length === 0 ? (
                <EmptyState
                  title="Không có đề thi nào"
                  description="Bạn có thể tạo một đề thi tùy chỉnh để tự kiểm tra kiến thức."
                />
              ) : (
                <div className="space-y-3">
                  {upcomingExams.map(ex => (
                    <div
                      key={ex.id}
                      onClick={() => navigateTo('exams', ex.id)}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {ex.title}
                        </span>
                        <Badge
                          variant={ex.isSubmitted ? 'success' : 'warning'}
                          size="sm"
                        >
                          {ex.isSubmitted ? `${ex.score}/10` : `${ex.durationMinutes}p`}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Môn: {ex.subjectName} • {ex.questions.length} câu hỏi
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Flashcard Due Review Card */}
            <Card
              title="Flashcard cần ôn"
              subtitle={`${summary?.totalFlashcardsDue ?? 0} thẻ đến hạn hôm nay`}
              extra={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateTo('flashcards')}
                  className="text-xs"
                >
                  Học ngay
                </Button>
              }
            >
              {widgetState === 'loading' ? (
                <LoadingSkeleton variant="list" count={2} />
              ) : decks.length === 0 || widgetState === 'empty' ? (
                <EmptyState
                  title="Không có thẻ cần ôn"
                  description="Tuyệt vời! Bạn đã hoàn thành tất cả các thẻ Spaced Repetition hôm nay."
                />
              ) : (
                <div className="space-y-2.5">
                  {decks.map(deck => (
                    <div
                      key={deck.id}
                      onClick={() => navigateTo('flashcards', deck.id)}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {deck.title}
                        </h5>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {deck.description}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="h-7 text-[11px] px-2.5 flex-shrink-0">
                        Ôn tập
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Activity Timeline */}
            <Card title="Hoạt động gần đây">
              {widgetState === 'loading' ? (
                <LoadingSkeleton variant="text" />
              ) : !summary || widgetState === 'empty' ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Chưa có lịch sử hoạt động
                </div>
              ) : (
                <div className="space-y-3">
                  {summary.recentActivityTimeline.map(item => (
                    <div key={item.id} className="flex items-start gap-2.5 text-xs">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FileCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-800 dark:text-slate-200 font-medium truncate">
                          {item.action}: <span className="font-normal text-slate-600 dark:text-slate-400">{item.target}</span>
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {item.timestamp}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
