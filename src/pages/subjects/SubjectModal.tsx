import React, { useEffect, useState } from 'react';
import { Subject } from '../../types/subject';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Select } from '../../components/common/Select';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subject: Omit<Subject, 'id' | 'createdAt'> & { id?: string }) => void;
  subjectToEdit?: Subject | null;
}

const COLOR_OPTIONS = [
  { value: '#4f46e5', label: 'Tím Indigo' },
  { value: '#0284c7', label: 'Xanh Lam Sky' },
  { value: '#059669', label: 'Xanh Lá Emerald' },
  { value: '#d97706', label: 'Cam Amber' },
  { value: '#7c3aed', label: 'Tím Violet' },
  { value: '#db2777', label: 'Hồng Pink' },
];

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  subjectToEdit,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState('#4f46e5');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (subjectToEdit) {
      setName(subjectToEdit.name);
      setCode(subjectToEdit.code);
      setColor(subjectToEdit.color);
      setDescription(subjectToEdit.description);
    } else {
      setName('');
      setCode('');
      setColor('#4f46e5');
      setDescription('');
    }
  }, [subjectToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: subjectToEdit?.id,
      name,
      code: code.toUpperCase(),
      color,
      description,
      icon: 'BookOpen',
      progress: subjectToEdit?.progress || 0,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={subjectToEdit ? 'Chỉnh sửa môn học' : 'Tạo môn học mới'}
      description="Thiết lập tên môn, mã học phần và màu sắc nhận diện"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Tên môn học"
              placeholder="Ví dụ: Giải tích 1, Cấu trúc Dữ liệu..."
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <Input
            label="Mã môn"
            placeholder="MAT101"
            value={code}
            onChange={e => setCode(e.target.value)}
            required
          />
        </div>

        <Select
          label="Màu sắc nhận diện"
          value={color}
          onChange={e => setColor(e.target.value)}
          options={COLOR_OPTIONS}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Mô tả môn học
          </label>
          <textarea
            rows={3}
            placeholder="Tóm tắt đề cương, mục tiêu môn học..."
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
            {subjectToEdit ? 'Lưu thay đổi' : 'Tạo môn học'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
