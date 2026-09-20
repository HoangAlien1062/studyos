import React, { useState } from 'react';
import {
  Bell,
  Command,
  Laptop,
  LogIn,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  User,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { useTheme } from '../../context/ThemeContext';
import { Dropdown } from '../common/Dropdown';
import { Tooltip } from '../common/Tooltip';
import { AuthModal } from '../auth/AuthModal';

interface TopbarProps {
  onMobileMenuToggle: () => void;
}

const TAB_NAMES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Tổng quan không gian học', subtitle: 'Theo dõi hoạt động và tiến độ hôm nay' },
  schedule: { title: 'Lịch học & Thời khóa biểu', subtitle: 'Quản lý các tiết học, phòng học và import TKB' },
  subjects: { title: 'Quản lý môn học', subtitle: 'Cấu trúc 3 cấp: Môn học, Chương và Chủ đề' },
  documents: { title: 'Tài liệu học tập', subtitle: 'Quản lý tệp tin, giáo trình và bài giảng' },
  notes: { title: 'Ghi chú học tập', subtitle: 'Trình soạn thảo hỗ trợ công thức Toán LaTeX và mã nguồn' },
  flashcards: { title: 'Flashcards', subtitle: 'Ôn tập ngắt quãng (Spaced Repetition)' },
  questions: { title: 'Ngân hàng câu hỏi', subtitle: 'Kho bài tập trắc nghiệm và chế độ luyện tập' },
  mistakes: { title: 'Sổ lỗi sai', subtitle: 'Tổng hợp các câu làm sai và phân tích nguyên nhân' },
  exams: { title: 'Đề thi & Luyện đề', subtitle: 'Tạo đề thi tùy chỉnh và làm bài kiểm tra tính giờ' },
  analytics: { title: 'Thống kê học tập', subtitle: 'Báo cáo chi tiết về kết quả và sự tiến bộ' },
  ai: { title: 'Trợ lý học tập AI', subtitle: 'Hỏi đáp bài tập, tóm tắt và giải thích kiến thức' },
  profile: { title: 'Hồ sơ cá nhân', subtitle: 'Thông tin sinh viên và tổng quan tài khoản' },
  settings: { title: 'Cài đặt hệ thống', subtitle: 'Giao diện, thông báo, AI provider và sao lưu dữ liệu' },
};

export const Topbar: React.FC<TopbarProps> = ({ onMobileMenuToggle }) => {
  const {
    activeTab,
    setIsCommandPaletteOpen,
    unreadNotifsCount,
    setIsNotificationDrawerOpen,
    navigateTo,
  } = useStudy();
  const { mode, setMode } = useTheme();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const currentMeta = TAB_NAMES[activeTab] || { title: 'StudyOS', subtitle: 'Personal Workspace' };

  return (
    <header className="h-16 sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Menu & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
            {currentMeta.title}
          </h1>
          <p className="hidden sm:block text-[11px] text-slate-400 dark:text-slate-500 truncate">
            {currentMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Search, Notifications, Theme, Profile */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Global Search Button (Ctrl + K) */}
        <button
          type="button"
          onClick={() => setIsCommandPaletteOpen(true)}
          className="flex items-center gap-2 sm:gap-3 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs transition-colors group"
        >
          <Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          <span className="hidden md:inline text-slate-500 dark:text-slate-400">
            Tìm nhanh...
          </span>
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-500 dark:text-slate-400 shadow-xs">
            <Command className="w-3 h-3" /> K
          </kbd>
        </button>

        {/* Theme Mode Switcher Dropdown */}
        <Dropdown
          align="right"
          trigger={
            <button
              type="button"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Đổi giao diện"
            >
              {mode === 'dark' ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : mode === 'light' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Laptop className="w-4 h-4 text-slate-500" />
              )}
            </button>
          }
          items={[
            {
              label: 'Chế độ Sáng',
              icon: <Sun className="w-4 h-4 text-amber-500" />,
              onClick: () => setMode('light'),
            },
            {
              label: 'Chế độ Tối',
              icon: <Moon className="w-4 h-4 text-indigo-400" />,
              onClick: () => setMode('dark'),
            },
            {
              label: 'Theo hệ thống',
              icon: <Laptop className="w-4 h-4 text-slate-500" />,
              onClick: () => setMode('system'),
            },
          ]}
        />

        {/* Notification Center Trigger */}
        <Tooltip content="Thông báo">
          <button
            type="button"
            onClick={() => setIsNotificationDrawerOpen(true)}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Xem thông báo"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            )}
          </button>
        </Tooltip>

        {/* Profile Avatar & Menu */}
        <Dropdown
          align="right"
          trigger={
            <div className="flex items-center gap-2 cursor-pointer p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                NL
              </div>
            </div>
          }
          items={[
            {
              label: 'Hồ sơ sinh viên',
              icon: <User className="w-4 h-4" />,
              onClick: () => navigateTo('profile'),
            },
            {
              label: 'Cài đặt hệ thống',
              icon: <Settings className="w-4 h-4" />,
              onClick: () => navigateTo('settings'),
            },
            {
              label: 'Đổi tài khoản / Đăng nhập',
              icon: <LogIn className="w-4 h-4" />,
              onClick: () => setIsAuthModalOpen(true),
            },
            { divider: true, label: '' },
            {
              label: 'Trợ giúp & Phím tắt',
              onClick: () => setIsCommandPaletteOpen(true),
            },
          ]}
        />
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </header>
  );
};
