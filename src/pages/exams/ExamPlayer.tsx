import React, { useEffect, useState } from 'react';
import katex from 'katex';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Clock,
  Flag,
  HelpCircle,
  Send,
} from 'lucide-react';
import { ExamSession } from '../../types/exam';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { examService } from '../../services/examService';

interface ExamPlayerProps {
  exam: ExamSession;
  onSubmit: (examId: string, answers: Record<string, string>, timeSpentSeconds: number) => Promise<void>;
  onExit: () => void;
}

export const ExamPlayer: React.FC<ExamPlayerProps> = ({ exam, onSubmit, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(exam.userAnswers || {});
  const [flaggedIds, setFlaggedIds] = useState<string[]>(exam.flaggedQuestionIds || []);
  const [secondsRemaining, setSecondsRemaining] = useState(exam.durationMinutes * 60);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restore draft if available
  useEffect(() => {
    const draft = examService.getDraftAnswers(exam.id);
    if (draft && draft.answers && Object.keys(draft.answers).length > 0) {
      setAnswers(draft.answers);
      if (typeof draft.secondsRemaining === 'number' && draft.secondsRemaining > 0) {
        setSecondsRemaining(draft.secondsRemaining);
      }
    }
  }, [exam.id]);

  // Auto-save draft on answer change
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      examService.saveDraftAnswers(exam.id, answers, secondsRemaining);
    }
  }, [answers, secondsRemaining, exam.id]);

  // Countdown timer
  useEffect(() => {
    if (secondsRemaining <= 0) {
      handleFinalSubmit();
      return;
    }
    const interval = setInterval(() => {
      setSecondsRemaining(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining]);

  const currentQ = exam.questions[currentIndex];

  const handleSelectAnswer = (optionId: string) => {
    if (!currentQ) return;
    setAnswers(prev => ({ ...prev, [currentQ.id]: optionId }));
  };

  const handleToggleFlag = () => {
    if (!currentQ) return;
    setFlaggedIds(prev =>
      prev.includes(currentQ.id) ? prev.filter(id => id !== currentQ.id) : [...prev, currentQ.id]
    );
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    const totalDurationSeconds = exam.durationMinutes * 60;
    const timeSpentSeconds = Math.max(1, totalDurationSeconds - secondsRemaining);

    try {
      await onSubmit(exam.id, answers, timeSpentSeconds);
    } finally {
      setIsSubmitting(false);
      setIsSubmitConfirmOpen(false);
    }
  };

  const renderMathContent = (rawText: string) => {
    const parts = rawText.split(/(\$\$[\s\S]*?\$\$|\$.*?\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2).trim();
        try {
          const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
          return <div key={i} className="my-2" dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <div key={i} className="text-rose-500 font-mono">{part}</div>;
        }
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1).trim();
        try {
          const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <span key={i} className="text-rose-500 font-mono">{part}</span>;
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const answeredCount = Object.keys(answers).length;
  const totalCount = exam.questions.length;
  const unansweredCount = totalCount - answeredCount;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onExit}>
            Thoát đề thi
          </Button>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {exam.title}
            </h2>
            <p className="text-[11px] text-slate-400">
              Môn: {exam.subjectName} • {totalCount} câu hỏi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Countdown Clock */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-sm ${
            minutes < 5
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900/50 text-rose-600 animate-pulse'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
          }`}>
            <Clock className="w-4 h-4" />
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsSubmitConfirmOpen(true)}
            leftIcon={<Send className="w-3.5 h-3.5" />}
          >
            Nộp bài thi
          </Button>
        </div>
      </div>

      {/* Main Two Column Area: Question (Left 8 cols) & Palette (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Question Area (8 cols) */}
        <div className="lg:col-span-8">
          {currentQ ? (
            <Card className="p-6 sm:p-7 space-y-6">
              {/* Question Subheader */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-400">
                    Câu {currentIndex + 1} / {totalCount}
                  </span>
                  <Badge variant="neutral" size="sm">
                    {currentQ.difficulty.toUpperCase()}
                  </Badge>
                </div>

                <Button
                  variant={flaggedIds.includes(currentQ.id) ? 'outline' : 'ghost'}
                  size="sm"
                  onClick={handleToggleFlag}
                  leftIcon={
                    <Flag
                      className={`w-3.5 h-3.5 ${
                        flaggedIds.includes(currentQ.id) ? 'fill-amber-500 text-amber-500' : ''
                      }`}
                    />
                  }
                  className={flaggedIds.includes(currentQ.id) ? 'border-amber-300 text-amber-600' : 'text-xs'}
                >
                  {flaggedIds.includes(currentQ.id) ? 'Đã cắm cờ' : 'Cắm cờ xem lại'}
                </Button>
              </div>

              {/* Question Content */}
              <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                {renderMathContent(currentQ.content)}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQ.options.map((opt, idx) => {
                  const isSelected = answers[currentQ.id] === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectAnswer(opt.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold ring-1 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-xs sm:text-sm">
                        {renderMathContent(opt.text)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Câu trước
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCurrentIndex(prev => Math.min(totalCount - 1, prev + 1))}
                  disabled={currentIndex === totalCount - 1}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Câu tiếp
                </Button>
              </div>
            </Card>
          ) : (
            <EmptyState title="Không tìm thấy câu hỏi" />
          )}
        </div>

        {/* Question Navigation Palette (Right 4 cols) */}
        <div className="lg:col-span-4">
          <Card className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
              Bảng câu hỏi ({answeredCount}/{totalCount} đã làm)
            </h3>

            {/* Grid of question buttons */}
            <div className="grid grid-cols-5 gap-2">
              {exam.questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = idx === currentIndex;
                const isFlagged = flaggedIds.includes(q.id);

                let btnClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-transparent';
                if (isCurrent) {
                  btnClass = 'ring-2 ring-indigo-500 font-black border-indigo-600';
                }
                if (isAnswered) {
                  btnClass += ' bg-indigo-600 dark:bg-indigo-600 text-white font-bold';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-xl flex items-center justify-center text-xs relative transition-all ${btnClass}`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-indigo-600" />
                <span>Đã trả lời ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-700" />
                <span>Chưa làm ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-500" />
                <span>Đã cắm cờ xem lại ({flaggedIds.length})</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => setIsSubmitConfirmOpen(true)}
              className="w-full mt-2"
              leftIcon={<Send className="w-4 h-4" />}
            >
              Nộp bài thi ngay
            </Button>
          </Card>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isSubmitConfirmOpen}
        onClose={() => setIsSubmitConfirmOpen(false)}
        onConfirm={handleFinalSubmit}
        isLoading={isSubmitting}
        title="Xác nhận nộp bài thi"
        confirmText="Nộp bài và chấm điểm"
        message={
          <div className="space-y-2">
            <p>
              Bạn có chắc chắn muốn nộp bài thi{' '}
              <strong className="text-slate-900 dark:text-slate-100">{exam.title}</strong>?
            </p>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <p>• Tổng số câu: <strong>{totalCount}</strong> câu</p>
              <p>• Đã hoàn thành: <strong className="text-indigo-600">{answeredCount}</strong> câu</p>
              {unansweredCount > 0 && (
                <p className="text-amber-600 font-semibold">
                  • Chưa trả lời: {unansweredCount} câu (sẽ bị tính là bỏ qua)
                </p>
              )}
            </div>
          </div>
        }
      />
    </div>
  );
};
