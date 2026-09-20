import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, FileText, Upload } from 'lucide-react';
import { ParsedScheduleItem } from '../../types/schedule';
import { scheduleService } from '../../services/scheduleService';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Table } from '../../components/common/Table';

interface ScheduleImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportConfirmed: (count: number) => void;
}

const SAMPLE_TXT = `Thứ 2 | 07:30 - 09:50 | Giải tích 1 | Phòng A2-301 | TS. Nguyễn Văn Hùng
Thứ 2 | 13:00 - 15:20 | Cấu trúc dữ liệu & Giải thuật | Lab 4 Tòa H1 | ThS. Trần Thị Mai
Thứ 3 | 09:00 - 11:15 | Vật lý Đại cương 1 | Hội trường B3 | PGS. TS. Lê Quốc Toàn
Thứ 4 | 15:30 - 17:30 | Tiếng Anh Học thuật B2 | Phòng C1-204 | Ms. Emily Watson
Thứ 5 | 08:00 - 10:00 | Giải tích 1 (Bài tập) | Phòng A2-205 | ThS. Đỗ Minh Quân`;

export const ScheduleImportModal: React.FC<ScheduleImportModalProps> = ({
  isOpen,
  onClose,
  onImportConfirmed,
}) => {
  const [txtContent, setTxtContent] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedScheduleItem[]>([]);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [fileName, setFileName] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await file.text();
      setTxtContent(text);
      parseText(text);
    } catch (err) {
      console.error(err);
    }
  };

  const parseText = (text: string) => {
    const items = scheduleService.parseTxtContent(text);
    setParsedItems(items);
    setStep('preview');
  };

  const handleUseSample = () => {
    setFileName('Thoi_khoa_bieu_mau.txt');
    setTxtContent(SAMPLE_TXT);
    parseText(SAMPLE_TXT);
  };

  const handleConfirmImport = async () => {
    const count = await scheduleService.importParsedItems(parsedItems);
    onImportConfirmed(count);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setTxtContent('');
    setParsedItems([]);
    setStep('upload');
    setFileName('');
  };

  const validCount = parsedItems.filter(p => p.isValid).length;
  const invalidCount = parsedItems.filter(p => !p.isValid).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Nhập thời khóa biểu từ tệp TXT"
      description="Quy trình: Đọc tệp → Phân tích cú pháp → Xem trước (Preview) → Kiểm tra → Xác nhận"
      size="xl"
    >
      {step === 'upload' ? (
        <div className="space-y-4">
          {/* Dropzone / File Picker */}
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center transition-colors">
            <input
              type="file"
              accept=".txt"
              id="txt-file-input"
              className="hidden"
              onChange={handleFileChange}
            />
            <label
              htmlFor="txt-file-input"
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Chọn tệp thời khóa biểu .TXT từ máy tính
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Định dạng: Thứ | Giờ bắt đầu - Giờ kết thúc | Môn học | Phòng học | Giảng viên
              </p>
              <div className="mt-4">
                <Button variant="outline" size="sm" type="button">
                  Duyệt tệp tin
                </Button>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
            <span className="px-3 text-xs text-slate-400 font-medium">HOẶC</span>
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
          </div>

          {/* Direct Text Paste Option */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Dán nội dung văn bản trực tiếp
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUseSample}
                leftIcon={<Copy className="w-3.5 h-3.5" />}
                className="text-[11px] h-6 px-2"
              >
                Dán dữ liệu mẫu
              </Button>
            </div>
            <textarea
              rows={5}
              placeholder="Dán các dòng thời khóa biểu vào đây..."
              value={txtContent}
              onChange={e => setTxtContent(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 p-3 text-xs font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!txtContent.trim()}
              onClick={() => parseText(txtContent)}
            >
              Phân tích và xem trước
            </Button>
          </div>
        </div>
      ) : (
        /* Preview Step */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {fileName || 'Nội dung dán trực tiếp'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>
                {validCount} hợp lệ
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="danger" size="sm" icon={<AlertCircle className="w-3 h-3" />}>
                  {invalidCount} lỗi
                </Badge>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Vui lòng kiểm tra lại bảng danh sách các tiết học đã được phân tích tự động dưới đây trước khi nhấn xác nhận import:
          </p>

          <Table<ParsedScheduleItem>
            data={parsedItems}
            keyExtractor={(item) => item.rawText}
            columns={[
              {
                key: 'status',
                title: 'Trạng thái',
                width: '100px',
                render: (item) => (
                  <Badge variant={item.isValid ? 'success' : 'danger'} size="sm">
                    {item.isValid ? 'Hợp lệ' : 'Lỗi định dạng'}
                  </Badge>
                ),
              },
              {
                key: 'subjectName',
                title: 'Môn học',
                render: (item) => (
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {item.subjectName}
                    </span>
                    {item.errorMessage && (
                      <p className="text-[10px] text-rose-500 mt-0.5">{item.errorMessage}</p>
                    )}
                  </div>
                ),
              },
              {
                key: 'time',
                title: 'Thời gian',
                render: (item) => (
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {item.startTime} - {item.endTime}
                  </span>
                ),
              },
              {
                key: 'date',
                title: 'Ngày áp dụng',
                render: (item) => item.date || 'Tuần hiện tại',
              },
              {
                key: 'location',
                title: 'Phòng học',
                render: (item) => item.location,
              },
              {
                key: 'teacher',
                title: 'Giảng viên',
                render: (item) => item.teacher || '---',
              },
            ]}
          />

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
              Quay lại chỉnh sửa
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={validCount === 0}
              onClick={handleConfirmImport}
            >
              Xác nhận import {validCount} tiết học
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
