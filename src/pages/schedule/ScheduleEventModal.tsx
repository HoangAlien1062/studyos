import React, { useEffect, useState } from 'react';
import { ScheduleEvent, ScheduleRepeatType } from '../../types/schedule';
import { Subject } from '../../types/subject';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Select } from '../../components/common/Select';

interface ScheduleEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<ScheduleEvent, 'id' | 'createdAt'> & { id?: string }) => void;
  eventToEdit?: ScheduleEvent | null;
  subjects: Subject[];
}

const COLOR_OPTIONS = [
  { value: '#4f46e5', label: 'Tím Indigo' },
  { value: '#0284c7', label: 'Xanh Lam Sky' },
  { value: '#059669', label: 'Xanh Lá Emerald' },
  { value: '#d97706', label: 'Cam Hổ phách Amber' },
  { value: '#7c3aed', label: 'Tím Violet' },
  { value: '#e11d48', label: 'Đỏ Rose' },
];

export const ScheduleEventModal: React.FC<ScheduleEventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  eventToEdit,
  subjects,
}) => {
  const [subjectId, setSubjectId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('07:30');
  const [endTime, setEndTime] = useState('09:50');
  const [location, setLocation] = useState('');
  const [teacher, setTeacher] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState('#4f46e5');
  const [repeat, setRepeat] = useState<ScheduleRepeatType>('weekly');

  useEffect(() => {
    if (eventToEdit) {
      setSubjectId(eventToEdit.subjectId);
      setSubjectName(eventToEdit.subjectName);
      setDate(eventToEdit.date);
      setStartTime(eventToEdit.startTime);
      setEndTime(eventToEdit.endTime);
      setLocation(eventToEdit.location);
      setTeacher(eventToEdit.teacher);
      setNotes(eventToEdit.notes || '');
      setColor(eventToEdit.color);
      setRepeat(eventToEdit.repeat);
    } else {
      const defaultSubj = subjects[0];
      setSubjectId(defaultSubj?.id || 'subj-custom');
      setSubjectName(defaultSubj?.name || 'Môn học mới');
      setDate(new Date().toISOString().split('T')[0]);
      setStartTime('07:30');
      setEndTime('09:50');
      setLocation('Phòng học A2-301');
      setTeacher('');
      setNotes('');
      setColor('#4f46e5');
      setRepeat('weekly');
    }
  }, [eventToEdit, subjects, isOpen]);

  const handleSubjectChange = (id: string) => {
    setSubjectId(id);
    const found = subjects.find(s => s.id === id);
    if (found) {
      setSubjectName(found.name);
      setColor(found.color);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: eventToEdit?.id,
      subjectId,
      subjectName,
      date,
      startTime,
      endTime,
      location: location || 'Chưa cập nhật phòng',
      teacher,
      notes,
      color,
      repeat,
      isCompleted: eventToEdit?.isCompleted || false,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={eventToEdit ? 'Chỉnh sửa tiết học' : 'Thêm tiết học mới'}
      description="Điền thông tin môn học, thời gian, phòng học và chu kỳ lặp lại"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {subjects.length > 0 ? (
          <Select
            label="Môn học"
            value={subjectId}
            onChange={e => handleSubjectChange(e.target.value)}
            options={subjects.map(s => ({ value: s.id, label: `${s.code} - ${s.name}` }))}
          />
        ) : (
          <Input
            label="Tên môn học"
            value={subjectName}
            onChange={e => setSubjectName(e.target.value)}
            required
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            type="date"
            label="Ngày học"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
          <Input
            type="time"
            label="Bắt đầu"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            required
          />
          <Input
            type="time"
            label="Kết thúc"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Địa điểm / Phòng học"
            placeholder="Ví dụ: Giảng đường A2 - Phòng 301"
            value={location}
            onChange={e => setLocation(e.target.value)}
            required
          />
          <Input
            label="Giảng viên"
            placeholder="Ví dụ: TS. Nguyễn Văn Hùng"
            value={teacher}
            onChange={e => setTeacher(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Chu kỳ lặp lại"
            value={repeat}
            onChange={e => setRepeat(e.target.value as ScheduleRepeatType)}
            options={[
              { value: 'weekly', label: 'Hàng tuần (Weekly)' },
              { value: 'daily', label: 'Hàng ngày (Daily)' },
              { value: 'none', label: 'Không lặp lại (Chỉ ngày này)' },
            ]}
          />
          <Select
            label="Màu sắc nhận diện"
            value={color}
            onChange={e => setColor(e.target.value)}
            options={COLOR_OPTIONS}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Ghi chú tiết học
          </label>
          <textarea
            rows={3}
            placeholder="Ghi chú bài tập, tài liệu mang theo, kiểm tra 15 phút..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 p-3 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {eventToEdit ? 'Lưu thay đổi' : 'Tạo tiết học'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
