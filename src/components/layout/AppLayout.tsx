import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { NotificationDrawer } from './NotificationDrawer';
import { AuthModal } from '../auth/AuthModal';
import { useStudy } from '../../context/StudyContext';

export interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { isAuthModalOpen, setIsAuthModalOpen, isAuthenticated } = useStudy();

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* Navigation Sidebar */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />

        {/* Unauthenticated Login Requirement Prompt Banner */}
        {!isAuthenticated && (
          <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-b border-indigo-200/50 dark:border-indigo-900/40 px-4 py-2.5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-center sm:text-left">
              <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">
                !
              </span>
              <span>
                <strong>Yêu cầu đăng nhập:</strong> Bạn chưa đăng nhập. Vui lòng đăng nhập hoặc tạo tài khoản để hệ thống lưu trữ tiến độ, bài học và lịch thi.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors flex-shrink-0 text-xs shadow-xs"
            >
              Đăng nhập / Đăng ký
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Modals / Overlays */}
      <CommandPalette />
      <NotificationDrawer />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};
