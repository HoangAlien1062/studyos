import React, { useEffect, useState } from 'react';
import { FlashcardDeck } from '../../types/flashcard';
import { Subject } from '../../types/subject';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Select } from '../../components/common/Select';

interface FlashcardDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deck: Omit<FlashcardDeck, 'id' | 'createdAt'> & { id?: string }) => void;
  deckToEdit?: FlashcardDeck | null;
  subjects: Subject[];
}

const COLOR_OPTIONS = [
  { value: '#4f46e5', label: 'Tím Indigo' },
  { value: '#0284c7', label: 'Xanh Lam Sky' },
  { value: '#059669', label: 'Xanh Lá Emerald' },
  { value: '#d97706', label: 'Cam Amber' },
  { value: '#7c3aed', label: 'Tím Violet' },
  { value: '#db2777', label: 'Hồng Pink' },
];

export const FlashcardDeckModal: React.FC<FlashcardDeckModalProps> = ({
  isOpen,
  onClose,
  onSave,
  deckToEdit,
  subjects,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [color, setColor] = useState('#4f46e5');

  useEffect(() => {
    if (deckToEdit) {
      setTitle(deckToEdit.title);
      setDescription(deckToEdit.description);
      setSubjectId(deckToEdit.subjectId || '');
      setColor(deckToEdit.color);
    } else {
      setTitle('');
      setDescription('');
      setSubjectId(subjects[0]?.id || '');
      setColor('#4f46e5');
    }
  }, [deckToEdit, subjects, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      id: deckToEdit?.id,
      title: title.trim(),
      description: description.trim(),
      subjectId: subjectId || undefined,
      color,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={deckToEdit ? 'Chỉnh sửa bộ thẻ' : 'Tạo bộ Flashcard mới'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Tên bộ thẻ"
          placeholder="Ví dụ: Giải tích 1 - Công thức Đạo hàm..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Môn học liên quan"
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            options={[
              { value: '', label: '-- Không chọn môn --' },
              ...subjects.map(s => ({ value: s.id, label: `${s.code} - ${s.name}` }))
            ]}
          />

          <Select
            label="Màu sắc chủ đề"
            value={color}
            onChange={e => setColor(e.target.value)}
            options={COLOR_OPTIONS}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Mô tả bộ thẻ
          </label>
          <textarea
            rows={3}
            placeholder="Tóm tắt nội dung các thẻ trong bộ này..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 p-3 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {deckToEdit ? 'Lưu thay đổi' : 'Tạo bộ thẻ'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
