import React, { useState } from 'react';
import katex from 'katex';
import { AlertCircle, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { MistakeItem } from '../../types/mistake';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Select } from '../../components/common/Select';

interface MistakeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  mistake: MistakeItem | null;
  onSaveReason: (id: string, reason: string) => Promise<void>;
  onMarkReviewed: (id: string) => Promise<void>;
}

const COMMON_REASONS = [
  { value: 'Đọc nhầm đề bài hoặc bỏ sót điều kiện', label: 'Đọc nhầm đề / Bỏ sót điều kiện' },
  { value: 'Quên hoặc nhớ nhầm công thức', label: 'Quên / Nhớ nhầm công thức' },
  { value: 'Tính toán ẩu / Nhầm dấu', label: 'Tính toán ẩu / Nhầm dấu' },
  { value: 'Chưa học hoặc chưa nắm vững lý thuyết', label: 'Chưa nắm vững lý thuyết' },
  { value: 'Bị lừa bởi phương án bẫy (Distractor)', label: 'Bị lừa bởi phương án bẫy' },
];

export const MistakeDetailModal: React.FC<MistakeDetailModalProps> = ({
  isOpen,
  onClose,
  mistake,
  onSaveReason,
  onMarkReviewed,
}) => {
  if (!mistake) return null;

  const [reason, setReason] = useState(mistake.reason || COMMON_REASONS[0].value);
  const [isEditingReason, setIsEditingReason] = useState(false);

  const handleUpdateReason = async () => {
    await onSaveReason(mistake.id, reason);
    setIsEditingReason(false);
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

  const selectedOpt = mistake.options.find(o => o.id === mistake.selectedOptionId);
  const correctOpt = mistake.options.find(o => o.id === mistake.correctOptionId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span>Chi tiết câu hỏi làm sai</span>
        </div>
      }
      size="lg"
      footer={
        <div className="w-full flex items-center justify-between">
          <Button
            variant={mistake.isReviewed ? 'outline' : 'primary'}
            size="sm"
            onClick={async () => {
              await onMarkReviewed(mistake.id);
              onClose();
            }}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            {mistake.isReviewed ? 'Đã xem lại (Xem tiếp)' : 'Đánh dấu đã hiểu bài'}
          </Button>

          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Subject & Review stats */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {mistake.subjectName}
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <span>Đã xem lại: <strong className="text-slate-800 dark:text-slate-200">{mistake.reviewCount} lần</strong></span>
            <span>Lần gần nhất: {mistake.lastReviewedAt || 'Chưa xem'}</span>
          </div>
        </div>

        {/* Question content */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            Nội dung câu hỏi
          </span>
          <div className="mt-1 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-xs leading-relaxed text-slate-900 dark:text-slate-100">
            {renderMathContent(mistake.questionContent)}
          </div>
        </div>

        {/* Answer comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Selected Wrong Option */}
          <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30">
            <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300 mb-1">
              <XCircle className="w-4 h-4" />
              Đáp án bạn đã chọn (Sai):
            </div>
            <p className="text-slate-800 dark:text-slate-200">
              {selectedOpt ? renderMathContent(selectedOpt.text) : 'Bỏ qua (chưa chọn)'}
            </p>
          </div>

          {/* Correct Option */}
          <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30">
            <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              Đáp án đúng:
            </div>
            <p className="text-slate-800 dark:text-slate-200 font-medium">
              {correctOpt ? renderMathContent(correctOpt.text) : '---'}
            </p>
          </div>
        </div>

        {/* Reason for Mistake */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Nguyên nhân làm sai:
            </span>
            {!isEditingReason ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingReason(true)}
                className="text-xs h-6 px-2"
              >
                Thay đổi lý do
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setIsEditingReason(false)} className="text-xs h-6 px-2">
                  Hủy
                </Button>
                <Button variant="primary" size="sm" onClick={handleUpdateReason} className="text-xs h-6 px-2">
                  Lưu
                </Button>
              </div>
            )}
          </div>

          {!isEditingReason ? (
            <p className="text-rose-600 dark:text-rose-400 font-medium italic">
              "{mistake.reason}"
            </p>
          ) : (
            <div className="space-y-2">
              <Select
                value={reason}
                onChange={e => setReason(e.target.value)}
                options={COMMON_REASONS}
              />
              <input
                type="text"
                placeholder="Hoặc tự ghi chú lý do sai riêng..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 p-2 text-xs bg-white dark:bg-slate-900"
              />
            </div>
          )}
        </div>

        {/* Explanation */}
        {mistake.explanation && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="font-bold text-slate-500 block mb-1">
              Giải thích cặn kẽ để không mắc lại:
            </span>
            <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {renderMathContent(mistake.explanation)}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
