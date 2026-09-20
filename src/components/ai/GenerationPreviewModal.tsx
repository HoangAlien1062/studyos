/**
 * AI Generation Preview Modal (StudyOS Part 4)
 * Enforces the strict rule: AI NEVER saves or deletes data without explicit user confirmation!
 * Allows users to preview, edit, select, and save AI-generated study materials.
 */

import React, { useState } from 'react';
import { Check, Edit2, Layers, HelpCircle, FileText, Trash2, X } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Input } from '../common/Input';

export type GenerationTargetType = 'flashcards' | 'questions' | 'notes';

export interface GenerationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: GenerationTargetType;
  draftData: any;
  onSaveConfirmed: (itemsToSave: any[]) => Promise<void>;
}

export const GenerationPreviewModal: React.FC<GenerationPreviewModalProps> = ({
  isOpen,
  onClose,
  targetType,
  draftData,
  onSaveConfirmed,
}) => {
  // Normalize items array
  const initialItems = Array.isArray(draftData)
    ? draftData
    : draftData?.items || draftData?.questions || (draftData ? [draftData] : []);

  const [items, setItems] = useState<any[]>(initialItems);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(initialItems.map((_: any, i: number) => i))
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    const list = Array.isArray(draftData)
      ? draftData
      : draftData?.items || draftData?.questions || (draftData ? [draftData] : []);
    setItems(list);
    setSelectedIndices(new Set(list.map((_: any, i: number) => i)));
    setEditingIndex(null);
  }, [draftData, isOpen]);

  const toggleSelect = (index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    setSelectedIndices(prev => {
      const next = new Set<number>();
      prev.forEach(i => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleUpdateItem = (index: number, key: string, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };

  const handleConfirmSave = async () => {
    const selectedItems = items.filter((_, i) => selectedIndices.has(i));
    if (selectedItems.length === 0) return;

    setIsSaving(true);
    try {
      await onSaveConfirmed(selectedItems);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const getTitle = () => {
    switch (targetType) {
      case 'flashcards':
        return 'Xem trước Thẻ Flashcard do AI tạo';
      case 'questions':
        return 'Xem trước Câu hỏi Trắc nghiệm do AI tạo';
      case 'notes':
        return 'Xem trước Bản ghi chú do AI tạo';
    }
  };

  const getIcon = () => {
    switch (targetType) {
      case 'flashcards':
        return <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'questions':
        return <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'notes':
        return <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {getIcon()}
          <span>{getTitle()}</span>
          <Badge variant="primary" size="sm">
            {items.length} mục đề xuất
          </Badge>
        </div>
      }
      description="Bạn có thể kiểm tra nội dung, chỉnh sửa câu chữ, loại bỏ mục không cần thiết trước khi chính thức lưu vào cơ sở dữ liệu học tập."
      size="xl"
      footer={
        <div className="w-full flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Đã chọn <strong>{selectedIndices.size}</strong> / {items.length} mục
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmSave}
              isLoading={isSaving}
              disabled={selectedIndices.size === 0}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Xác nhận & Lưu {selectedIndices.size} mục
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Không có mục nào để hiển thị.
          </div>
        ) : (
          items.map((item, idx) => {
            const isSelected = selectedIndices.has(idx);
            const isEditing = editingIndex === idx;

            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition-colors ${
                  isSelected
                    ? 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/10'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(idx)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Mục #{idx + 1}
                    </span>
                    {item.difficulty && (
                      <Badge variant="neutral" size="sm">
                        {item.difficulty}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingIndex(isEditing ? null : idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{isEditing ? 'Đóng sửa' : 'Chỉnh sửa'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* FLASHCARD PREVIEW */}
                {targetType === 'flashcards' && (
                  <div className="space-y-2 text-xs">
                    {isEditing ? (
                      <>
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 block mb-1">Mặt trước (Khái niệm/Câu hỏi):</label>
                          <Input
                            value={item.front}
                            onChange={val => handleUpdateItem(idx, 'front', val)}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 block mb-1">Mặt sau (Định nghĩa/Đáp án):</label>
                          <textarea
                            rows={2}
                            value={item.back}
                            onChange={e => handleUpdateItem(idx, 'back', e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-semibold">MẶT TRƯỚC:</span>
                          <p className="mt-1 text-slate-800 dark:text-slate-200 font-medium">{item.front}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-semibold">MẶT SAU:</span>
                          <p className="mt-1 text-slate-800 dark:text-slate-200">{item.back}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* QUESTION PREVIEW */}
                {targetType === 'questions' && (
                  <div className="space-y-2 text-xs">
                    {isEditing ? (
                      <>
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 block mb-1">Nội dung câu hỏi:</label>
                          <textarea
                            rows={2}
                            value={item.content}
                            onChange={e => handleUpdateItem(idx, 'content', e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 block mb-1">Lời giải thích:</label>
                          <Input
                            value={item.explanation || ''}
                            onChange={val => handleUpdateItem(idx, 'explanation', val)}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{item.content}</p>
                        {item.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            {item.options.map((opt: any, oIdx: number) => {
                              const isCorrect = opt.id === item.correctOptionId;
                              return (
                                <div
                                  key={oIdx}
                                  className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                                    isCorrect
                                      ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-semibold'
                                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <span>{opt.text}</span>
                                  {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {item.explanation && (
                          <p className="text-[11px] text-slate-400 mt-2 italic">
                            💡 Giải thích: {item.explanation}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* NOTES PREVIEW */}
                {targetType === 'notes' && (
                  <div className="space-y-2 text-xs">
                    {isEditing ? (
                      <>
                        <Input
                          label="Tiêu đề ghi chú"
                          value={item.title}
                          onChange={val => handleUpdateItem(idx, 'title', val)}
                        />
                        <textarea
                          rows={6}
                          value={item.contentMarkdown}
                          onChange={e => handleUpdateItem(idx, 'contentMarkdown', e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono"
                        />
                      </>
                    ) : (
                      <>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{item.title}</h4>
                        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300 line-clamp-6">
                          {item.contentMarkdown}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
};
