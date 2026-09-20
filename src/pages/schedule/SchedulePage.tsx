import React, { useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  MapPin,
  Plus,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { useToast } from '../../context/ToastContext';
import { scheduleService } from '../../services/scheduleService';
import { subjectService } from '../../services/subjectService';
import { ScheduleEvent } from '../../types/schedule';
import { Subject } from '../../types/subject';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ScheduleEventModal } from './ScheduleEventModal';
import { ScheduleImportModal } from './ScheduleImportModal';

type CalendarView = 'day' | 'week' | 'month';

export const SchedulePage: React.FC = () => {
  const { dataVersion, triggerDataRefresh } = useStudy();
  const toast = useToast();

  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [view, setView] = useState<CalendarView>('week');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Modal states
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<ScheduleEvent | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<ScheduleEvent | null>(null);

  const loadData = async () => {
    const [scList, subList] = await Promise.all([
      scheduleService.getSchedules(),
      subjectService.getSubjects(),
    ]);
    setEvents(scList);
    setSubjects(subList);
  };

  useEffect(() => {
    loadData();
  }, [dataVersion]);

  // Date Navigation
  const handlePrev = () => {
    const d = new Date(selectedDate);
    if (view === 'day') d.setDate(d.getDate() - 1);
    else if (view === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setSelectedDate(d);
  };

  const handleNext = () => {
    const d = new Date(selectedDate);
    if (view === 'day') d.setDate(d.getDate() + 1);
    else if (view === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setSelectedDate(d);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // CRUD actions
  const handleSaveEvent = async (eventData: Omit<ScheduleEvent, 'id' | 'createdAt'> & { id?: string }) => {
    await scheduleService.saveSchedule(eventData);
    toast.success('Đã lưu tiết học thành công', eventData.subjectName);
    triggerDataRefresh();
  };

  const handleToggleComplete = async (id: string) => {
    const res = await scheduleService.toggleComplete(id);
    if (res) {
      toast.success(res.isCompleted ? 'Đã hoàn thành tiết học' : 'Đã bỏ hoàn thành tiết học');
      triggerDataRefresh();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;
    await scheduleService.deleteSchedule(eventToDelete.id);
    toast.success('Đã xóa tiết học thành công');
    setEventToDelete(null);
    triggerDataRefresh();
  };

  // Week view calculation
  const getWeekDays = (curr: Date) => {
    const d = new Date(curr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Bắt đầu từ Thứ 2
    d.setDate(diff);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const next = new Date(d);
      next.setDate(d.getDate() + i);
      week.push(next);
    }
    return week;
  };

  const weekDays = getWeekDays(selectedDate);
  const selectedDateStr = selectedDate.toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: View Modes and Today */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['day', 'week', 'month'] as CalendarView[]).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  view === v
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {v === 'day' ? 'Ngày' : v === 'week' ? 'Tuần' : 'Tháng'}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={handleToday}>
            Hôm nay
          </Button>

          <div className="flex items-center">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Thời gian trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Thời gian tiếp theo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 ml-1">
            {view === 'month'
              ? `Tháng ${selectedDate.getMonth() + 1}, ${selectedDate.getFullYear()}`
              : view === 'day'
              ? selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
              : `Tuần ${weekDays[0].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${weekDays[6].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Import TKB (TXT)
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEventToEdit(null);
              setIsEventModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Thêm tiết học
          </Button>
        </div>
      </div>

      {/* VIEW: TUẦN (WEEK VIEW) */}
      {view === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((day, idx) => {
            const dateStr = day.toISOString().split('T')[0];
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const dayEvents = events.filter(e => e.date === dateStr);
            const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

            return (
              <div
                key={dateStr}
                className={`flex flex-col rounded-2xl border bg-white dark:bg-slate-900 overflow-hidden min-h-[420px] ${
                  isToday
                    ? 'border-indigo-500 shadow-sm ring-1 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Column Header */}
                <div
                  className={`p-3 text-center border-b border-slate-100 dark:border-slate-800 ${
                    isToday
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase">{dayNames[idx]}</p>
                  <p className={`text-base font-bold mt-0.5 ${isToday ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                    {day.getDate()}
                  </p>
                </div>

                {/* Event Slots */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {dayEvents.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-300 dark:text-slate-700 text-xs italic p-4 text-center">
                      Không có tiết
                    </div>
                  ) : (
                    dayEvents.map(event => (
                      <div
                        key={event.id}
                        className={`p-2.5 rounded-xl border text-xs transition-all relative group ${
                          event.isCompleted
                            ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-75'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-xs'
                        }`}
                        style={{ borderLeftColor: event.color, borderLeftWidth: '4px' }}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <h4 className={`font-semibold truncate ${event.isCompleted ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {event.subjectName}
                          </h4>
                          <button
                            onClick={() => handleToggleComplete(event.id)}
                            className="text-slate-400 hover:text-indigo-600 flex-shrink-0"
                            title={event.isCompleted ? 'Bỏ hoàn thành' : 'Đánh dấu hoàn thành'}
                          >
                            <CheckCircle2 className={`w-3.5 h-3.5 ${event.isCompleted ? 'text-emerald-500' : ''}`} />
                          </button>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span>{event.startTime} - {event.endTime}</span>
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>

                        {/* Hover action buttons */}
                        <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEventToEdit(event);
                              setIsEventModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setEventToDelete(event)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Xóa"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW: NGÀY (DAY VIEW) */}
      {view === 'day' && (
        <Card
          title={`Chi tiết lịch học ngày ${selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}`}
          extra={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEventToEdit(null);
                setIsEventModalOpen(true);
              }}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Thêm tiết vào ngày này
            </Button>
          }
        >
          {events.filter(e => e.date === selectedDateStr).length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Không có tiết học nào trong ngày này</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events
                .filter(e => e.date === selectedDateStr)
                .map(event => (
                  <div
                    key={event.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                    style={{ borderLeftColor: event.color, borderLeftWidth: '5px' }}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {event.subjectName}
                        </h4>
                        <Badge variant={event.isCompleted ? 'success' : 'primary'} size="sm">
                          {event.isCompleted ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          {event.startTime} - {event.endTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {event.location}
                        </span>
                        {event.teacher && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {event.teacher}
                          </span>
                        )}
                      </div>

                      {event.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">
                          "{event.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleComplete(event.id)}
                      >
                        {event.isCompleted ? 'Bỏ hoàn thành' : 'Đánh dấu xong'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEventToEdit(event);
                          setIsEventModalOpen(true);
                        }}
                      >
                        Sửa
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEventToDelete(event)}
                        className="text-rose-600"
                      >
                        Xóa
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>
      )}

      {/* VIEW: THÁNG (MONTH VIEW) */}
      {view === 'month' && (
        <Card title={`Lịch tháng ${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()}`}>
          <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-400 mb-2">
            <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: 35 }, (_, idx) => {
              const dayNum = (idx % 30) + 1;
              const dateStr = `2026-09-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = events.filter(e => e.date === dateStr);
              return (
                <div
                  key={idx}
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(dayNum);
                    setSelectedDate(d);
                    setView('day');
                  }}
                  className="min-h-[70px] sm:min-h-[85px] p-1 sm:p-2 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {dayNum}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.map(e => (
                      <div
                        key={e.id}
                        className="text-[10px] truncate px-1 rounded font-medium text-white"
                        style={{ backgroundColor: e.color }}
                      >
                        {e.subjectName}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Modals */}
      <ScheduleEventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEventToEdit(null);
        }}
        onSave={handleSaveEvent}
        eventToEdit={eventToEdit}
        subjects={subjects}
      />

      <ScheduleImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportConfirmed={(count) => {
          toast.success(`Đã nhập thành công ${count} tiết học vào thời khóa biểu`);
          triggerDataRefresh();
        }}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDestructive
        title="Xác nhận xóa tiết học"
        message={
          <>
            Bạn có chắc chắn muốn xóa tiết học{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {eventToDelete?.subjectName}
            </strong>{' '}
            vào lúc {eventToDelete?.startTime} - {eventToDelete?.endTime} không?
          </>
        }
      />
    </div>
  );
};
