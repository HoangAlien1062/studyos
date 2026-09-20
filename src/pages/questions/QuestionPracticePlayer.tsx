import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import katex from 'katex';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Tag,
  XCircle,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { mistakeService } from '../../services/mistakeService';
import { questionService } from '../../services/questionService';
import { EvaluationResult, QuestionItem } from '../../types/question';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { MistakeReasonModal } from '../../components/mistakes/MistakeReasonModal';

interface QuestionPracticePlayerProps {
  questions: QuestionItem[];
  subjectName?: string;
  onExit: () => void;
}

export const QuestionPracticePlayer: React.FC<QuestionPracticePlayerProps> = ({
  questions,
  subjectName = 'Môn học',
  onExit,
}) => {
  const toast = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [scoreStats, setScoreStats] = useState({ correct: 0, wrong: 0 });
  const [isCompleted, setIsCompleted] = useState(false);

  // Time tracking
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // Mistake reason modal
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [lastWrongAnswerId, setLastWrongAnswerId] = useState<string>('');

  const currentQ = questions[currentIndex];

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIndex]);

  const handleSelectOption = (optId: string) => {
    if (isAnswerSubmitted) return;

    if (currentQ.type === 'multiple_choice') {
      setSelectedAnswers(prev =>
        prev.includes(optId) ? prev.filter(id => id !== optId) : [...prev, optId]
      );
    } else {
      setSelectedAnswers([optId]);
    }
  };

  const handleSubmitAnswer = async () => {
    if (selectedAnswers.length === 0 || !currentQ) return;
    setIsAnswerSubmitted(true);

    const timeSpentSeconds = Math.max(1, Math.round((Date.now() - questionStartTime) / 1000));
    const answerPayload = currentQ.type === 'multiple_choice' ? selectedAnswers : selectedAnswers[0];

    const result = await questionService.submitAnswer(
      currentQ,
      answerPayload,
      timeSpentSeconds,
      'practice'
    );
    setEvaluation(result);

    if (result.isCorrect) {
      setScoreStats(prev => ({ ...prev, correct: prev.correct + 1 }));
      toast.success('Chính xác!', 'Bạn đã trả lời đúng câu hỏi này.');
    } else {
      setScoreStats(prev => ({ ...prev, wrong: prev.wrong + 1 }));
      const ansString = selectedAnswers.join(', ');
      setLastWrongAnswerId(ansString);
      // Mở modal xác định lý do sai
      setIsReasonModalOpen(true);
    }
  };

  const handleReasonSelected = async (reason: string) => {
    if (!currentQ) return;
    await mistakeService.recordWrongAnswer(
      currentQ,
      lastWrongAnswerId,
      subjectName,
      reason
    );
    toast.warning('Đã lưu vào Sổ lỗi', `Lý do: "${reason}"`);
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswers([]);
      setIsAnswerSubmitted(false);
      setEvaluation(null);
    } else {
      setIsCompleted(true);
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedAnswers([]);
      setIsAnswerSubmitted(false);
      setEvaluation(null);
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

  if (questions.length === 0) {
    return (
      <Card className="max-w-xl mx-auto text-center p-8">
        <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Chưa có câu hỏi nào để luyện tập
        </h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">
          Hãy thêm câu hỏi vào môn học này trong Ngân hàng câu hỏi trước khi bắt đầu.
        </p>
        <Button variant="primary" size="sm" onClick={onExit}>
          Quay lại Ngân hàng câu hỏi
        </Button>
      </Card>
    );
  }

  // Summary Screen
  if (isCompleted) {
    const total = scoreStats.correct + scoreStats.wrong;
    const accuracy = total > 0 ? Math.round((scoreStats.correct / total) * 100) : 100;

    return (
      <div className="max-w-md mx-auto p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-5 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
          <Sparkles className="w-8 h-8" />
        </div>
        <div>
          <Badge variant="primary" size="sm" className="mb-2">
            Hoàn thành luyện tập
          </Badge>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {subjectName}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Bạn đã hoàn thành toàn bộ {questions.length} câu hỏi luyện tập.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 dark:border-slate-800 text-center">
          <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300">
            <span className="text-lg font-bold block">{scoreStats.correct}</span>
            <span className="text-[11px] font-medium">Đúng</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300">
            <span className="text-lg font-bold block">{scoreStats.wrong}</span>
            <span className="text-[11px] font-medium">Sai</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300">
            <span className="text-lg font-bold block">{accuracy}%</span>
            <span className="text-[11px] font-medium">Chính xác</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              setCurrentIndex(0);
              setSelectedAnswers([]);
              setIsAnswerSubmitted(false);
              setEvaluation(null);
              setIsCompleted(false);
              setScoreStats({ correct: 0, wrong: 0 });
            }}
            className="flex-1"
          >
            Luyện lại
          </Button>
          <Button variant="primary" size="md" onClick={onExit} className="flex-1">
            Xong luyện tập
          </Button>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in duration-150 pb-20 sm:pb-6">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onExit}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="active:scale-95 transition-transform"
        >
          Thoát
        </Button>

        <div className="flex items-center gap-2">
          <Badge variant="neutral" size="sm">
            Câu {currentIndex + 1} / {questions.length}
          </Badge>
          <Badge
            variant={
              currentQ.difficulty === 'hard'
                ? 'danger'
                : currentQ.difficulty === 'medium'
                ? 'warning'
                : 'success'
            }
            size="sm"
          >
            {currentQ.difficulty === 'hard'
              ? 'Khó'
              : currentQ.difficulty === 'medium'
              ? 'Trung bình'
              : 'Dễ'}
          </Badge>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Question Card */}
      <Card className="p-6 sm:p-8 space-y-6 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {currentQ.type === 'multiple_choice'
                ? 'Chọn một hoặc nhiều đáp án đúng:'
                : 'Chọn một đáp án đúng nhất:'}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
            {renderMathContent(currentQ.content)}
          </h3>

          {currentQ.image && (
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-60 bg-slate-50 flex items-center justify-center">
              <img src={currentQ.image} alt="Question Diagram" className="max-h-60 object-contain" />
            </div>
          )}
        </div>

        {/* Options List */}
        <div className="space-y-2.5">
          {currentQ.options.map(opt => {
            const isSelected = selectedAnswers.includes(opt.id);
            const isCorrectAnswer =
              currentQ.type === 'multiple_choice'
                ? (currentQ.correctOptionIds || [currentQ.correctOptionId]).includes(opt.id)
                : opt.id === currentQ.correctOptionId;

            let optionStyle =
              'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200';

            if (isAnswerSubmitted) {
              if (isCorrectAnswer) {
                optionStyle =
                  'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-500';
              } else if (isSelected && !isCorrectAnswer) {
                optionStyle =
                  'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 ring-1 ring-rose-500';
              }
            } else if (isSelected) {
              optionStyle =
                'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-600';
            }

            return (
              <div
                key={opt.id}
                onClick={() => handleSelectOption(opt.id)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs sm:text-sm font-medium active:scale-99 ${optionStyle}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                      currentQ.type === 'multiple_choice' ? 'rounded-md' : 'rounded-full'
                    } ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span>{renderMathContent(opt.text)}</span>
                </div>

                {isAnswerSubmitted && (
                  <div>
                    {isCorrectAnswer ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : isSelected ? (
                      <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Immediate Explanation Box (Visible after submission) */}
        {isAnswerSubmitted && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <AlertCircle className="w-4 h-4" />
              <span>Giải thích chi tiết:</span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {currentQ.explanation ? renderMathContent(currentQ.explanation) : 'Chưa có giải thích chi tiết cho câu hỏi này.'}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Câu trước
          </Button>

          {!isAnswerSubmitted ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmitAnswer}
              disabled={selectedAnswers.length === 0}
              className="px-6 shadow-sm"
            >
              Kiểm tra đáp án
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleNext}
              className="px-6 shadow-sm"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {currentIndex + 1 < questions.length ? 'Câu tiếp theo' : 'Xem kết quả'}
            </Button>
          )}
        </div>
      </Card>

      {/* Mistake Reason Modal */}
      <MistakeReasonModal
        isOpen={isReasonModalOpen}
        questionContent={currentQ?.content}
        onSelectReason={handleReasonSelected}
        onClose={() => setIsReasonModalOpen(false)}
      />
    </div>
  );
};
