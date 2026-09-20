import React, { useEffect, useState } from 'react';
import { Chapter, Topic } from '../../types/subject';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Select } from '../../components/common/Select';

interface TopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (topic: Omit<Topic, 'id'> & { id?: string }) => void;
  topicToEdit?: Topic | null;
  subjectId: string;
  chapters: Chapter[];
  defaultChapterId?: string;
}

export const TopicModal: React.FC<TopicModalProps> = ({
  isOpen,
  onClose,
  onSave,
  topicToEdit,
  subjectId,
  chapters,
  defaultChapterId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [order, setOrder] = useState(1);

  useEffect(() => {
    if (topicToEdit) {
      setTitle(topicToEdit.title);
      setDescription(topicToEdit.description);
      setChapterId(topicToEdit.chapterId);
      setOrder(topicToEdit.order);
    } else {
      setTitle('');
      setDescription('');
      setChapterId(defaultChapterId || chapters[0]?.id || '');
      setOrder(1);
    }
  }, [topicToEdit, defaultChapterId, chapters, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: topicToEdit?.id,
      subjectId,
      chapterId: chapterId || chapters[0]?.id || '',
      title,
      description,
      order: Number(order),
      isCompleted: topicToEdit?.isCompleted || false,
      linkedDocIds: topicToEdit?.linkedDocIds || [],
      linkedNoteIds: topicToEdit?.linkedNoteIds || [],
      linkedFlashcardDeckIds: topicToEdit?.linkedFlashcardDeckIds || [],
      linkedQuestionIds: topicToEdit?.linkedQuestionIds || [],
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={topicToEdit ? 'Chỉnh sửa chủ đề' : 'Thêm chủ đề mới'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {chapters.length > 0 && (
          <Select
            label="Thuộc chương"
            value={chapterId}
            onChange={e => setChapterId(e.target.value)}
            options={chapters.map(c => ({ value: c.id, label: c.title }))}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-3">
            <Input
              label="Tên chủ đề"
              placeholder="Ví dụ: Giới hạn dãy số và hàm số"
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
            Nội dung tóm tắt chủ đề
          </label>
          <textarea
            rows={3}
            placeholder="Kiến thức trọng tâm cần đạt được trong chủ đề này..."
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
            {topicToEdit ? 'Lưu thay đổi' : 'Tạo chủ đề'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
