import React, { useState } from 'react';
import {
  AlertOctagon,
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileCheck,
  FolderArchive,
  GraduationCap,
  HelpCircle,
  Layers,
  LayoutDashboard,
  Lock,
  LogIn,
  Settings,
  Shield,
  User,
  X
} from 'lucide-react';
import { NavigationTab } from '../../types/common';
import { useStudy } from '../../context/StudyContext';
import { Tooltip } from '../common/Tooltip';
import { UserAvatar } from '../common/UserAvatar';

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'schedule', label: 'Lịch học', icon: CalendarDays },
  { id: 'subjects', label: 'Môn học', icon: BookOpen },
  { id: 'documents', label: 'Tài liệu', icon: FolderArchive },
  { id: 'notes', label: 'Ghi chú', icon: Edit3 },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'questions', label: 'Ngân hàng câu hỏi', icon: HelpCircle },
  { id: 'mistakes', label: 'Sổ lỗi sai', icon: AlertOctagon },
  { id: 'exams', label: 'Đề thi', icon: FileCheck },
  { id: 'analytics', label: 'Thống kê', icon: BarChart3 },
  { id: 'ai', label: 'Trợ lý AI', icon: Bot },
  { id: 'profile', label: 'Hồ sơ cá nhân', icon: User },
  { id: 'settings', label: 'Cài đặt', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onMobileClose }) => {
  const { activeTab, navigateTo, isAuthenticated, currentUser, setIsAuthModalOpen } = useStudy();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const handleNavClick = (tab: NavigationTab) => {
    if (!isAuthenticated && tab !== 'dashboard' && tab !== 'settings') {
      setIsAuthModalOpen(true);
      if (isMobileOpen) onMobileClose();
      return;
    }
    navigateTo(tab);
    if (isMobileOpen) {
      onMobileClose();
    }
  };

  // KHI CHƯA ĐĂNG NHẬP: ẨN TOÀN BỘ các mục học tập cá nhân (Lịch học, Môn học, Tài liệu, Ghi chú, Flashcards, Câu hỏi, Sổ lỗi sai, Đề thi, Thống kê, AI, Hồ sơ)
  // Chỉ hiển thị đầy đủ khi đã đăng nhập tài khoản Supabase
  const visibleNavItems = isAuthenticated
    ? [
        ...NAV_ITEMS,
        ...(currentUser?.role === 'admin' || currentUser?.email === 'student@studyos.edu.vn' || currentUser?.email === 'phamnguyenhoang10@gmail.com'
          ? [{ id: 'admin' as NavigationTab, label: '🛡️ Quản trị Admin', icon: Shield }]
          : []),
      ]
    : NAV_ITEMS.filter(item => item.id === 'dashboard' || item.id === 'settings');

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-200 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100 dark:border-slate-800">
        <div
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center gap-3 cursor-pointer overflow-hidden"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-indigo-500/30">
            <GraduationCap className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Study<span className="text-indigo-600 dark:text-indigo-400">OS</span>
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                Study Workspace
              </span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={onMobileClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {visibleNavItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          const linkButton = (
            <button
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group relative ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-200'
              } ${isCollapsed ? 'justify-center !px-0' : ''}`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                }`}
              />
              {!isCollapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}
              {!isCollapsed && item.badge && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                  {item.badge}
                </span>
              )}
            </button>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={item.id} content={item.label} position="right" className="w-full">
                {linkButton}
              </Tooltip>
            );
          }

          return <div key={item.id}>{linkButton}</div>;
        })}

        {/* Unauthenticated Lock Banner & CTA in Sidebar */}
        {!isAuthenticated && (
          <div className="pt-2 px-1">
            <button
              type="button"
              onClick={() => {
                setIsAuthModalOpen(true);
                if (isMobileOpen) onMobileClose();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all group ${
                isCollapsed ? 'justify-center !px-0' : ''
              }`}
              title="Đăng nhập để mở khóa"
            >
              <LogIn className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && (
                <span className="truncate flex-1 text-left">Đăng nhập tài khoản</span>
              )}
            </button>

            {!isCollapsed && (
              <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                  <Lock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Dữ liệu học tập đang ẩn</span>
                </div>
                <p className="text-[10px] leading-relaxed">
                  Đăng nhập để hiển thị Môn học, Tài liệu, Flashcards, Đề thi và Trợ lý AI theo tài khoản của bạn.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Mini Profile */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            if (isAuthenticated) {
              handleNavClick('profile');
            } else {
              setIsAuthModalOpen(true);
            }
          }}
          className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left ${
            isCollapsed ? 'justify-center !p-1' : ''
          }`}
        >
          <UserAvatar
            avatarUrl={isAuthenticated ? currentUser?.avatarUrl : undefined}
            name={isAuthenticated ? currentUser?.name : undefined}
            preferIcon={!isAuthenticated}
            size="sm"
          />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {isAuthenticated ? (currentUser?.name || 'Học viên StudyOS') : 'Chưa đăng nhập'}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                {isAuthenticated
                  ? (currentUser?.major || currentUser?.school || currentUser?.gradeOrYear || 'Học viên')
                  : 'Nhấn để đăng nhập / đăng ký'}
              </p>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block h-screen sticky top-0 transition-all duration-200 z-30 flex-shrink-0 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
