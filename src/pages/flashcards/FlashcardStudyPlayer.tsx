import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import katex from 'katex';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  RotateCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Flashcard, FlashcardDeck, FlashcardRating } from '../../types/flashcard';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

interface FlashcardStudyPlayerProps {
  deck: FlashcardDeck;
  cards: Flashcard[];
  onReviewCard: (cardId: string, rating: FlashcardRating) => Promise<void>;
  onExit: () => void;
}

export const FlashcardStudyPlayer: React.FC<FlashcardStudyPlayerProps> = ({
  deck,
  cards,
  onReviewCard,
  onExit,
}) => {
  const sessionKey = `studyos_fc_session_${deck.id}`;

  // Restore saved session index if available
  const [currentIndex, setCurrentIndex] = useState(() => {
    try {
      const saved = localStorage.getItem(sessionKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed >= 0 && parsed < cards.length) return parsed;
      }
    } catch {
      // Ignore
    }
    return 0;
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  // Swipe gesture state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const currentCard = cards[currentIndex];

  // Save session index
  useEffect(() => {
    try {
      localStorage.setItem(sessionKey, String(currentIndex));
    } catch {
      // Ignore
    }
  }, [currentIndex, sessionKey]);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (isFlipped) handleRating('good');
        else handleFlip();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (isFlipped) handleRating('again');
        else handleFlip();
      } else if (isFlipped) {
        if (e.key === '1') handleRating('again');
        else if (e.key === '2') handleRating('hard');
        else if (e.key === '3') handleRating('good');
        else if (e.key === '4') handleRating('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentIndex, currentCard]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleRating = async (rating: FlashcardRating) => {
    if (!currentCard) return;

    setStats(prev => ({ ...prev, [rating]: prev[rating] + 1 }));
    await onReviewCard(currentCard.id, rating);

    setIsFlipped(false);
    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsCompleted(true);
      try {
        localStorage.removeItem(sessionKey);
      } catch {
        // Ignore
      }
      confetti({
        particleCount: 100,
        spread: 75,
        origin: { y: 0.6 },
      });
    }
  };

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchCurrentX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    setTouchCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX !== null && touchCurrentX !== null) {
      const deltaX = touchCurrentX - touchStartX;
      const SWIPE_THRESHOLD = 70;

      if (deltaX > SWIPE_THRESHOLD) {
        // Swiped Right -> Good / Flip
        if (isFlipped) {
          handleRating('good');
        } else {
          handleFlip();
        }
      } else if (deltaX < -SWIPE_THRESHOLD) {
        // Swiped Left -> Again / Flip
        if (isFlipped) {
          handleRating('again');
        } else {
          handleFlip();
        }
      } else if (Math.abs(deltaX) < 10) {
        // Pure tap without swipe movement
        handleFlip();
      }
    }
    setTouchStartX(null);
    setTouchCurrentX(null);
    setIsSwiping(false);
  };

  const deltaX = touchStartX !== null && touchCurrentX !== null ? touchCurrentX - touchStartX : 0;
  const tiltRotation = Math.max(-15, Math.min(15, deltaX * 0.1));

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

  if (cards.length === 0) {
    return (
      <Card className="max-w-xl mx-auto text-center p-8">
        <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Bộ thẻ này chưa có thẻ nào
        </h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">
          Hãy thêm thẻ flashcard câu hỏi và câu trả lời vào bộ này trước khi bắt đầu học.
        </p>
        <Button variant="primary" size="sm" onClick={onExit}>
          Quay lại danh sách thẻ
        </Button>
      </Card>
    );
  }

  // Session Completed Summary Screen
  if (isCompleted) {
    const totalRated = stats.again + stats.hard + stats.good + stats.easy;
    const accuracy = totalRated > 0 ? Math.round(((stats.good + stats.easy) / totalRated) * 100) : 100;

    return (
      <div className="max-w-md mx-auto p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-5 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
          <Sparkles className="w-8 h-8" />
        </div>
        <div>
          <Badge variant="success" size="sm" className="mb-2">
            Hoàn thành lượt học!
          </Badge>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {deck.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Bạn đã ôn tập toàn bộ {cards.length} thẻ ghi nhớ. Độ chuẩn xác: <strong className="text-emerald-600 dark:text-emerald-400">{accuracy}%</strong>
          </p>
        </div>

        {/* Rating Breakdown */}
        <div className="grid grid-cols-4 gap-2 py-3 border-y border-slate-100 dark:border-slate-800 text-center">
          <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300">
            <span className="text-base font-bold block">{stats.again}</span>
            <span className="text-[11px] font-medium">Again</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
            <span className="text-base font-bold block">{stats.hard}</span>
            <span className="text-[11px] font-medium">Hard</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300">
            <span className="text-base font-bold block">{stats.good}</span>
            <span className="text-[11px] font-medium">Good</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300">
            <span className="text-base font-bold block">{stats.easy}</span>
            <span className="text-[11px] font-medium">Easy</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              setCurrentIndex(0);
              setIsFlipped(false);
              setIsCompleted(false);
              setStats({ again: 0, hard: 0, good: 0, easy: 0 });
            }}
            className="flex-1"
          >
            Học lại từ đầu
          </Button>
          <Button variant="primary" size="md" onClick={onExit} className="flex-1">
            Xong lượt học
          </Button>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / cards.length) * 100);

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-28 sm:pb-6 animate-in fade-in duration-150 select-none">
      {/* Top Header & Progress */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onExit}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="active:scale-95 transition-transform"
        >
          Thoát
        </Button>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>{currentIndex + 1}</span>
          <span>/</span>
          <span>{cards.length} thẻ</span>
        </div>

        <Badge variant="primary" size="sm">
          {currentCard?.difficulty ? `Độ khó: ${currentCard.difficulty}` : 'SRS Level'}
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 3D SWIPEABLE FLASHCARD CONTAINER */}
      <div className="perspective-1000 py-2">
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleFlip}
          style={{
            transform: isSwiping
              ? `translateX(${deltaX}px) rotate(${tiltRotation}deg)`
              : undefined,
            transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1)',
          }}
          className="relative w-full min-h-[340px] sm:min-h-[380px] cursor-pointer touch-pan-y"
        >
          {/* Visual Swipe Direction Badges */}
          {deltaX > 40 && (
            <div className="absolute top-4 left-4 z-30 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold shadow-lg animate-in fade-in">
              THUỘC / TIẾP TỤC →
            </div>
          )}
          {deltaX < -40 && (
            <div className="absolute top-4 right-4 z-30 px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold shadow-lg animate-in fade-in">
              ← CẦN ÔN LẠI
            </div>
          )}

          {/* 3D Flip Card Body */}
          <div
            className={`w-full h-full min-h-[340px] sm:min-h-[380px] transform-style-3d transition-card-flip relative rounded-3xl border-2 shadow-lg ${
              isFlipped ? 'rotate-y-180' : ''
            } ${
              isFlipped
                ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/20 dark:bg-slate-900'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
            }`}
          >
            {/* FRONT FACE */}
            <div className="absolute inset-0 backface-hidden p-6 sm:p-8 flex flex-col justify-between rounded-3xl">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <Badge variant="neutral" size="sm">
                  Mặt trước • Câu hỏi
                </Badge>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <RotateCw className="w-3.5 h-3.5 animate-spin-slow" /> Chạm để lật
                </span>
              </div>

              <div className="my-auto py-4 text-center">
                <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {renderMathContent(currentCard.front)}
                </div>
                {currentCard.hint && (
                  <p className="text-xs text-slate-400 italic mt-3">
                    Gợi ý: {currentCard.hint}
                  </p>
                )}
              </div>

              <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <span>Lướt trái/phải hoặc chạm để lật thẻ</span>
              </div>
            </div>

            {/* BACK FACE */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 p-6 sm:p-8 flex flex-col justify-between rounded-3xl bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <Badge variant="primary" size="sm">
                  Mặt sau • Đáp án & Giải thích
                </Badge>
                <span className="text-[11px] text-indigo-500 font-medium">
                  Chọn mức độ nhớ ở bên dưới ↓
                </span>
              </div>

              <div className="my-auto py-4 text-center space-y-3">
                <div className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400 leading-relaxed">
                  {renderMathContent(currentCard.back)}
                </div>
                {currentCard.hint && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 inline-block max-w-sm">
                    {currentCard.hint}
                  </div>
                )}
              </div>

              <div className="text-center text-[11px] text-slate-400">
                Phím tắt: 1 (Again) • 2 (Hard) • 3 (Good) • 4 (Easy)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION BAR (STICKY ON MOBILE) */}
      <div className="fixed sm:static bottom-0 left-0 right-0 p-3 sm:p-0 bg-white/95 dark:bg-slate-900/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t border-slate-200 dark:border-slate-800 sm:border-t-0 z-40">
        {isFlipped ? (
          <div className="grid grid-cols-4 gap-2 max-w-xl mx-auto animate-in slide-in-from-bottom-2 duration-150">
            <button
              type="button"
              onClick={() => handleRating('again')}
              className="min-h-[48px] flex flex-col items-center justify-center p-2 rounded-2xl bg-rose-50 active:bg-rose-100 dark:bg-rose-950/40 dark:active:bg-rose-900/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 active:scale-95 transition-transform"
            >
              <span className="text-xs font-bold">Again</span>
              <span className="text-[10px] opacity-75 mt-0.5">Ôn ngay (1)</span>
            </button>

            <button
              type="button"
              onClick={() => handleRating('hard')}
              className="min-h-[48px] flex flex-col items-center justify-center p-2 rounded-2xl bg-amber-50 active:bg-amber-100 dark:bg-amber-950/40 dark:active:bg-amber-900/50 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 active:scale-95 transition-transform"
            >
              <span className="text-xs font-bold">Hard</span>
              <span className="text-[10px] opacity-75 mt-0.5">+1 ngày (2)</span>
            </button>

            <button
              type="button"
              onClick={() => handleRating('good')}
              className="min-h-[48px] flex flex-col items-center justify-center p-2 rounded-2xl bg-sky-50 active:bg-sky-100 dark:bg-sky-950/40 dark:active:bg-sky-900/50 border border-sky-200 dark:border-sky-900/60 text-sky-700 dark:text-sky-300 active:scale-95 transition-transform"
            >
              <span className="text-xs font-bold">Good</span>
              <span className="text-[10px] opacity-75 mt-0.5">+3 ngày (3)</span>
            </button>

            <button
              type="button"
              onClick={() => handleRating('easy')}
              className="min-h-[48px] flex flex-col items-center justify-center p-2 rounded-2xl bg-emerald-50 active:bg-emerald-100 dark:bg-emerald-950/40 dark:active:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 active:scale-95 transition-transform"
            >
              <span className="text-xs font-bold">Easy</span>
              <span className="text-[10px] opacity-75 mt-0.5">+4 ngày (4)</span>
            </button>
          </div>
        ) : (
          <div className="max-w-xl mx-auto">
            <Button
              variant="primary"
              size="lg"
              onClick={handleFlip}
              className="w-full min-h-[48px] text-sm font-bold shadow-md active:scale-98 transition-transform"
              rightIcon={<RotateCw className="w-4 h-4" />}
            >
              Lật xem đáp án (Phím Space)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
