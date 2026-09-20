import React, { useEffect, useState } from 'react';
import {
  Bell,
  Bot,
  Database,
  Download,
  Laptop,
  Moon,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  Shield,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { settingsService } from '../../services/settingsService';
import { ThemeMode } from '../../types/common';
import { FullAppSettings } from '../../types/settings';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Select } from '../../components/common/Select';
import { Switch } from '../../components/common/Switch';
import { Tabs } from '../../components/common/Tabs';
import { AISettingsModal } from '../ai/AISettingsModal';

export const SettingsPage: React.FC = () => {
  const { mode, setMode } = useTheme();
  const { dataVersion, triggerDataRefresh } = useStudy();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'notifications' | 'ai' | 'data' | 'privacy'>('general');
  const [settings, setSettings] = useState<FullAppSettings | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isWipeConfirmOpen, setIsWipeConfirmOpen] = useState(false);

  const loadSettings = async () => {
    const s = await settingsService.getSettings();
    setSettings(s);
  };

  useEffect(() => {
    loadSettings();
  }, [dataVersion]);

  if (!settings) return null;

  const handleWipeAllData = async () => {
    await settingsService.wipeAllUserData();
    setIsWipeConfirmOpen(false);
    toast.success('Đã xóa sạch toàn bộ dữ liệu mẫu!', 'Không gian học tập của bạn đã sẵn sàng với trang trắng.');
    triggerDataRefresh();
    setTimeout(() => window.location.reload(), 300);
  };

  // General Handlers
  const handleUpdateGeneral = async (patch: Partial<FullAppSettings['general']>) => {
    const updated = await settingsService.updateGeneral(patch);
    setSettings(prev => prev ? { ...prev, general: updated } : null);
    toast.success('Đã cập nhật cài đặt chung');
  };

  // Appearance Handlers
  const handleUpdateAppearance = async (patch: Partial<FullAppSettings['appearance']>) => {
    const updated = await settingsService.updateAppearance(patch);
    setSettings(prev => prev ? { ...prev, appearance: updated } : null);
    if (patch.theme) setMode(patch.theme);
    toast.success('Đã cập nhật giao diện');
  };

  // Notification Handlers
  const handleUpdateNotifications = async (patch: Partial<FullAppSettings['notifications']>) => {
    const updated = { ...settings.notifications, ...patch };
    await settingsService.saveSettings({ ...settings, notifications: updated });
    setSettings(prev => prev ? { ...prev, notifications: updated } : null);
    toast.success('Đã cập nhật cấu hình thông báo');
  };

  // Data Export / Import
  const handleExportData = () => {
    const jsonStr = settingsService.exportBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StudyOS_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất bản sao lưu JSON thành công');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const success = settingsService.importBackupJson(text);
      if (success) {
        toast.success('Khôi phục dữ liệu từ tệp JSON thành công!');
        triggerDataRefresh();
        loadSettings();
      } else {
        toast.error('Tệp JSON không đúng định dạng sao lưu của StudyOS');
      }
    } catch {
      toast.error('Lỗi khi đọc tệp JSON');
    }
  };

  const handleResetData = () => {
    settingsService.resetAllData();
    toast.success('Đã khôi phục dữ liệu mẫu ban đầu');
    setIsResetConfirmOpen(false);
    triggerDataRefresh();
    window.location.reload();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Settings Header */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
          Cài đặt hệ thống StudyOS
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Tùy chỉnh trải nghiệm học tập, giao diện, nhà cung cấp AI và sao lưu dữ liệu
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={t => setActiveTab(t as any)}
        tabs={[
          { id: 'general', label: 'Cài đặt chung', icon: <SettingsIcon className="w-4 h-4" /> },
          { id: 'appearance', label: 'Giao diện', icon: <Sun className="w-4 h-4" /> },
          { id: 'notifications', label: 'Thông báo', icon: <Bell className="w-4 h-4" /> },
          { id: 'ai', label: 'Trí tuệ AI', icon: <Bot className="w-4 h-4" /> },
          { id: 'data', label: 'Dữ liệu & Sao lưu', icon: <Database className="w-4 h-4" /> },
          { id: 'privacy', label: 'Bảo mật', icon: <Shield className="w-4 h-4" /> },
        ]}
      />

      {/* TAB 1: GENERAL */}
      {activeTab === 'general' && (
        <Card title="Cài đặt hệ thống chung" className="space-y-5 p-6">
          {/* Persona Switcher */}
          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                Đối tượng người dùng chính:
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                {settings.profile.educationLevel === 'high_school'
                  ? '🎒 Chế độ Học sinh Cấp 3 (THPT - Lớp 10, 11, 12, Ôn thi Tốt nghiệp/Đại học)'
                  : '🎓 Chế độ Sinh viên Đại học / Cao đẳng (Tín chỉ, Học phần, Đồ án, GPA)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await settingsService.updateProfile({ educationLevel: 'high_school' });
                  loadSettings();
                  toast.success('Đã chuyển sang chế độ Học sinh Cấp 3 (THPT)');
                  triggerDataRefresh();
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                  settings.profile.educationLevel === 'high_school'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                🎒 Học sinh Cấp 3
              </button>
              <button
                type="button"
                onClick={async () => {
                  await settingsService.updateProfile({ educationLevel: 'university' });
                  loadSettings();
                  toast.success('Đã chuyển sang chế độ Sinh viên Đại học');
                  triggerDataRefresh();
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                  settings.profile.educationLevel !== 'high_school'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                🎓 Sinh viên ĐH
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Ngôn ngữ hiển thị"
              value={settings.general.language}
              onChange={e => handleUpdateGeneral({ language: e.target.value as any })}
              options={[
                { value: 'vi', label: '🇻🇳 Tiếng Việt (Mặc định)' },
                { value: 'en', label: '🇺🇸 English' },
              ]}
            />

            <Select
              label="Định dạng thời gian"
              value={settings.general.timeFormat}
              onChange={e => handleUpdateGeneral({ timeFormat: e.target.value as any })}
              options={[
                { value: '24h', label: '24 Giờ (14:30)' },
                { value: '12h', label: '12 Giờ (02:30 PM)' },
              ]}
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <Switch
              label="Chế độ thu gọn danh sách (Compact mode)"
              description="Giảm bớt khoảng trống để hiển thị nhiều thông tin hơn trên một màn hình."
              checked={settings.general.compactMode}
              onChange={val => handleUpdateGeneral({ compactMode: val })}
            />

            <Switch
              label="Âm thanh hiệu ứng thông báo"
              description="Phát âm thanh nhẹ khi hoàn thành bài tập hoặc đến giờ học."
              checked={settings.general.soundEnabled}
              onChange={val => handleUpdateGeneral({ soundEnabled: val })}
            />
          </div>
        </Card>
      )}

      {/* TAB 2: APPEARANCE */}
      {activeTab === 'appearance' && (
        <Card title="Tuỳ biến giao diện & Màu sắc" className="space-y-6 p-6">
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Chế độ màu hiển thị (Theme mode)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', label: 'Sáng (Light)', icon: <Sun className="w-5 h-5 text-amber-500" /> },
                { id: 'dark', label: 'Tối (Dark)', icon: <Moon className="w-5 h-5 text-indigo-400" /> },
                { id: 'system', label: 'Theo hệ thống', icon: <Laptop className="w-5 h-5 text-slate-500" /> },
              ].map(t => (
                <div
                  key={t.id}
                  onClick={() => handleUpdateAppearance({ theme: t.id as ThemeMode })}
                  className={`p-4 rounded-2xl border text-center cursor-pointer transition-all flex flex-col items-center gap-2 ${
                    mode === t.id
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20 font-bold'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {t.icon}
                  <span className="text-xs">{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Màu sắc chủ đạo (Accent Color)
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                { color: '#4f46e5', label: 'Indigo' },
                { color: '#0284c7', label: 'Sky' },
                { color: '#059669', label: 'Emerald' },
                { color: '#d97706', label: 'Amber' },
                { color: '#7c3aed', label: 'Violet' },
                { color: '#db2777', label: 'Rose' },
              ].map(c => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => handleUpdateAppearance({ accentColor: c.color })}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform hover:scale-105 ${
                    settings.appearance.accentColor === c.color ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-105' : ''
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* TAB 3: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <Card title="Cài đặt thông báo & Nhắc nhở" className="space-y-5 p-6">
          <Switch
            label="Nhắc nhở lịch học sắp bắt đầu"
            description="Thông báo trước 15 phút khi chuẩn bị đến tiết học trong ngày."
            checked={settings.notifications.scheduleReminders}
            onChange={val => handleUpdateNotifications({ scheduleReminders: val })}
          />

          <Switch
            label="Thông báo đề thi đến hạn"
            description="Nhắc nhở làm bài luyện đề và các kỳ thi thử của các môn học."
            checked={settings.notifications.upcomingExams}
            onChange={val => handleUpdateNotifications({ upcomingExams: val })}
          />

          <Switch
            label="Nhắc ôn Flashcard ngắt quãng (Spaced Repetition)"
            description="Báo khi có thẻ flashcard chuyển sang trạng thái cần ôn (Due) hôm nay."
            checked={settings.notifications.flashcardsDue}
            onChange={val => handleUpdateNotifications({ flashcardsDue: val })}
          />

          <Switch
            label="Thông báo cập nhật hệ thống"
            description="Nhận các bản tin tính năng mới từ nền tảng StudyOS."
            checked={settings.notifications.systemUpdates}
            onChange={val => handleUpdateNotifications({ systemUpdates: val })}
          />
        </Card>
      )}

      {/* TAB 4: AI SETTINGS SHORTCUT */}
      {activeTab === 'ai' && (
        <Card title="Cấu hình Trợ lý AI & Mô hình LLM" className="p-6 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            StudyOS hỗ trợ tích hợp linh hoạt với nhiều nhà cung cấp mô hình trí tuệ nhân tạo hàng đầu như Google Gemini, OpenAI GPT-4o, Anthropic Claude và OpenRouter. Bạn có thể nhập API Key riêng để sử dụng không giới hạn.
          </p>

          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                Nhà cung cấp hiện tại: {settings.ai.primaryProvider.toUpperCase()}
              </span>
              <span className="text-slate-500 dark:text-slate-400 mt-0.5 block">
                Mô hình: {settings.ai.providers[settings.ai.primaryProvider]?.model || 'Gemini 3.6 Flash'}
              </span>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAiModalOpen(true)}
              leftIcon={<Bot className="w-4 h-4" />}
            >
              Mở cấu hình AI & API Keys
            </Button>
          </div>
        </Card>
      )}

      {/* TAB 5: DATA MANAGEMENT & BACKUP */}
      {activeTab === 'data' && (
        <Card title="Quản lý dữ liệu & Sao lưu" className="p-6 space-y-6">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Xuất bản sao lưu dữ liệu (Export JSON)
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tải toàn bộ lịch học, môn học, tài liệu, ghi chú, flashcard, câu hỏi, đề thi và cài đặt về máy tính của bạn dưới dạng tệp JSON.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Tải xuống bản sao lưu (.JSON)
            </Button>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Khôi phục dữ liệu từ tệp sao lưu (Import JSON)
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nhập tệp sao lưu JSON đã tải về trước đó để đồng bộ lại dữ liệu học tập.
            </p>
            <div>
              <input
                type="file"
                id="json-backup-input"
                className="hidden"
                accept=".json"
                onChange={handleImportFile}
              />
              <label htmlFor="json-backup-input">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => document.getElementById('json-backup-input')?.click()}
                  leftIcon={<Upload className="w-4 h-4" />}
                >
                  Chọn tệp JSON để khôi phục
                </Button>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400">
              Xóa sạch toàn bộ dữ liệu (Bắt đầu với trang trắng 0 dữ liệu)
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Xóa toàn bộ môn học, thẻ flashcard, câu hỏi, đề thi, sổ lỗi sai, lịch học và cuộc trò chuyện AI. Không gian học tập sẽ trở về trạng thái trống hoàn toàn (0 dữ liệu) để bạn sẵn sàng nhập dữ liệu thật của bản thân.
            </p>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsWipeConfirmOpen(true)}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Xóa sạch dữ liệu (Khởi tạo trang trắng)
            </Button>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400">
              Khôi phục dữ liệu mẫu ban đầu (Reset demo data)
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Xóa các thay đổi cục bộ và tải lại bộ dữ liệu giáo dục mẫu ban đầu của StudyOS.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetConfirmOpen(true)}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Khôi phục dữ liệu mẫu
            </Button>
          </div>
        </Card>
      )}

      {/* TAB 6: PRIVACY */}
      {activeTab === 'privacy' && (
        <Card title="Quyền riêng tư & Lưu trữ cục bộ" className="p-6 space-y-5">
          <Switch
            label="Cho phép lưu trữ dữ liệu ngoại tuyến (Offline Local Caching)"
            description="Toàn bộ lịch học, ghi chú và bài tập của bạn được lưu an toàn trong trình duyệt (LocalStorage/IndexedDB) và hoạt động ngay cả khi mất mạng."
            checked={settings.privacy.allowLocalCaching}
            onChange={val => {
              settingsService.updatePrivacy({ allowLocalCaching: val });
              toast.success('Đã cập nhật tùy chọn lưu trữ');
            }}
          />

          <Switch
            label="Thu thập thống kê học tập ẩn danh"
            description="Giúp StudyOS tính toán biểu đồ độ chính xác và chuỗi học tập cá nhân."
            checked={settings.privacy.analyticsCollection}
            onChange={val => {
              settingsService.updatePrivacy({ analyticsCollection: val });
              toast.success('Đã cập nhật tùy chọn thống kê');
            }}
          />
        </Card>
      )}

      {/* AI Settings Modal */}
      <AISettingsModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onSettingsSaved={() => {
          toast.success('Đã lưu cài đặt AI');
          triggerDataRefresh();
        }}
      />

      {/* Wipe All Data Confirm Dialog */}
      <ConfirmDialog
        isOpen={isWipeConfirmOpen}
        onClose={() => setIsWipeConfirmOpen(false)}
        onConfirm={handleWipeAllData}
        isDestructive
        title="Xóa sạch toàn bộ dữ liệu (Khởi tạo trang trắng)"
        message="Hành động này sẽ XÓA SẠCH toàn bộ môn học, flashcard, câu hỏi, đề thi, sổ lỗi sai, lịch học và cuộc trò chuyện AI hiện tại. Hệ thống sẽ chuyển sang trạng thái 0 dữ liệu để bạn tự tạo tài liệu học tập của mình. Bạn có chắc chắn muốn xóa toàn bộ?"
      />

      {/* Reset Confirm Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetData}
        isDestructive
        title="Khôi phục dữ liệu mẫu ban đầu"
        message="Hành động này sẽ xóa các ghi chú, đề thi và môn học bạn đã tạo thêm và khôi phục lại dữ liệu mẫu tiếng Việt ban đầu. Bạn có chắc chắn muốn tiếp tục?"
      />
    </div>
  );
};
