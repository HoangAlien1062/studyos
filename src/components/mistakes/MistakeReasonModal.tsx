import React, { useState } from 'react';
import { AlertCircle, Check, Tag, X } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Input } from '../common/Input';
import { COMMON_MISTAKE_REASONS } from '../../types/mistake';

interface MistakeReasonModalProps {
  isOpen: boolean;
  questionContent?: string;
  initialReason?: string;
  onSelectReason: (reason: string) => void;
  onClose: () => void;
}

export const MistakeReasonModal: React.FC<MistakeReasonModalProps> = ({
  isOpen,
  questionContent,
  initialReason,
  onSelectReason,
  onClose,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>(initialReason || COMMON_MISTAKE_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const finalReason = isCustomMode && customReason.trim().length > 0
      ? customReason.trim()
      : selectedPreset;
    onSelectReason(finalReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Xác định Lý do Làm sai
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lưu vào Sổ lỗi sai để phân tích thói quen và khắc phục
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {questionContent && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Câu hỏi: </span>
              {questionContent}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Chọn lý do phổ biến:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_MISTAKE_REASONS.map(reason => {
                const isSelected = !isCustomMode && selectedPreset === reason;
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(reason);
                      setIsCustomMode(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium border text-left transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-500 dark:text-indigo-300 ring-1 ring-indigo-500'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span>{reason}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setIsCustomMode(true)}
              className={`text-xs font-semibold hover:underline mb-1.5 inline-block ${
                isCustomMode ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              + Hoặc tự nhập lý do riêng:
            </button>
            {isCustomMode && (
              <Input
                placeholder="Ví dụ: Nhầm dấu trừ thành dấu cộng ở bước tích phân..."
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                autoFocus
                className="text-xs"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Button variant="outline" size="sm" onClick={onClose}>
            Bỏ qua
          </Button>
          <Button variant="primary" size="sm" onClick={handleConfirm}>
            Lưu lý do vào Sổ lỗi
          </Button>
        </div>
      </div>
    </div>
  );
};
