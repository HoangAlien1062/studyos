import React, { useEffect, useState } from 'react';
import { Chapter } from '../../types/subject';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';

interface ChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (chapter: Omit<Chapter, 'id'> & { id?: string }) => void;
  chapterToEdit?: Chapter | null;
  subjectId: string;
  nextOrder: number;
}

export const ChapterModal: React.FC<ChapterModalProps> = ({
  isOpen,
  onClose,
  onSave,
  chapterToEdit,
  subjectId,
  nextOrder,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState(1);

  useEffect(() => {
    if (chapterToEdit) {
      setTitle(chapterToEdit.title);
      setDescription(chapterToEdit.description);
      setOrder(chapterToEdit.order);
    } else {
      setTitle('');
      setDescription('');
      setOrder(nextOrder);
    }
  }, [chapterToEdit, nextOrder, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: chapterToEdit?.id,
      subjectId,
      title,
      description,
      order: Number(order),
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={chapterToEdit ? 'Chỉnh sửa chương' : 'Thêm chương mới'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-3">
            <Input
              label="Tên chương"
              placeholder="Ví dụ: Chương 1: Giới hạn và Tính liên tục"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          <Input
            type="number"
            label="Thứ tự"
            value={order}
            onChange={e => setOrder(Number(e.target.value))}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Mô tả tóm tắt chương
          </label>
          <textarea
            rows={3}
            placeholder="Khái niệm trọng tâm của chương này..."
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
            {chapterToEdit ? 'Lưu thay đổi' : 'Tạo chương'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
