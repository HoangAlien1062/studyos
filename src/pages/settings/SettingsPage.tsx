import React, { useEffect, useState } from 'react';
import {
  Bell,
  Bot,
  Laptop,
  Moon,
  Settings as SettingsIcon,
  Shield,
  Sun,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { settingsService } from '../../services/settingsService';
import { authService } from '../../services/authService';
import { ThemeMode } from '../../types/common';
import { FullAppSettings } from '../../types/settings';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Select } from '../../components/common/Select';
import { Switch } from '../../components/common/Switch';
import { Tabs } from '../../components/common/Tabs';
import { AISettingsModal } from '../ai/AISettingsModal';

export const SettingsPage: React.FC = () => {
  const { mode, setMode } = useTheme();
  const { dataVersion, triggerDataRefresh } = useStudy();
  const toast = useToast();
  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'notifications' | 'ai' | 'privacy'>('general');
  const [settings, setSettings] = useState<FullAppSettings | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const loadSettings = async () => {
    const s = await settingsService.getSettings();
    setSettings(s);
  };

  useEffect(() => {
    loadSettings();
  }, [dataVersion]);

  if (!settings) return null;

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

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Settings Header */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
          Cài đặt hệ thống StudyOS
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Tùy chỉnh trải nghiệm học tập, giao diện, nhà cung cấp AI và bảo mật tài khoản
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

          <div className="max-w-xs">
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
        <Card title="Giao diện hiển thị (Theme sáng / tối)" className="space-y-6 p-6">
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
        <Card title="Cấu hình Trí tuệ AI & Mô hình LLM" className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                Nhà cung cấp hiện tại: {settings.ai.primaryProvider.toUpperCase()}
              </span>
              <span className="text-slate-500 dark:text-slate-400 mt-0.5 block">
                Mô hình: {settings.ai.providers[settings.ai.primaryProvider]?.model || 'Gemini 3.6 Flash'}
              </span>
            </div>

            {isAdmin ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAiModalOpen(true)}
                leftIcon={<Bot className="w-4 h-4" />}
              >
                Mở cấu hình AI & API Keys (Admin)
              </Button>
            ) : (
              <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                ✓ AI hệ thống hoạt động sẵn sàng
              </div>
            )}
          </div>

          {!isAdmin ? (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              💡 <strong>Lưu ý:</strong> Nền tảng StudyOS đã cấu hình sẵn mô hình AI cho toàn bộ học viên. Bạn có thể sử dụng trực tiếp các tính năng Trợ lý AI, giải bài tập, tạo thẻ ghi nhớ mà không cần tự nhập API key. Chỉ tài khoản Quản trị viên (Admin) mới có quyền chỉnh sửa hoặc thay đổi API Key hệ thống.
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Với tư cách Quản trị viên, bạn có thể thiết lập API Key chung (Gemini, GPT-4o, Claude, OpenRouter) để toàn bộ học viên trong hệ thống cùng sử dụng.
            </p>
          )}
        </Card>
      )}

      {/* TAB 5: PRIVACY */}
      {activeTab === 'privacy' && (
        <Card title="Quyền riêng tư & Lưu trữ tài khoản" className="p-6 space-y-5">
          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
            <span className="font-bold block">☁️ Đồng bộ đám mây Supabase Cloud</span>
            <p className="text-[11px] leading-relaxed opacity-90">
              Toàn bộ môn học, tài liệu, đề thi và câu hỏi của bạn được lưu trữ an toàn trên máy chủ đám mây Supabase theo tài khoản cá nhân. Không lưu cache ngoại tuyến dùng chung giúp bảo vệ thông tin khi đăng xuất hoặc sử dụng trên thiết bị công cộng.
            </p>
          </div>

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
    </div>
  );
};
