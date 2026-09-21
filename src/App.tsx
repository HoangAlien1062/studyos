import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { StudyProvider, useStudy } from './context/StudyContext';
import { AppLayout } from './components/layout/AppLayout';

import { DashboardPage } from './pages/dashboard/DashboardPage';
import { SchedulePage } from './pages/schedule/SchedulePage';
import { SubjectListPage } from './pages/subjects/SubjectListPage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { NotesPage } from './pages/notes/NotesPage';
import { FlashcardsPage } from './pages/flashcards/FlashcardsPage';
import { QuestionBankPage } from './pages/questions/QuestionBankPage';
import { MistakeLogbookPage } from './pages/mistakes/MistakeLogbookPage';
import { ExamsPage } from './pages/exams/ExamsPage';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { AIAssistantPage } from './pages/ai/AIAssistantPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { Lock, LogIn } from 'lucide-react';

const AppContent: React.FC = () => {
  const { activeTab, isAuthenticated, setIsAuthModalOpen } = useStudy();

  const renderActiveView = () => {
    if (!isAuthenticated && activeTab !== 'dashboard' && activeTab !== 'settings') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[55vh] text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Không gian học tập đang bị khóa
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tính năng này yêu cầu đăng nhập tài khoản đám mây Supabase để tải dữ liệu môn học, tài liệu, flashcard và đề thi cá nhân của bạn.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-colors flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Đăng nhập / Đăng ký ngay
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'schedule':
        return <SchedulePage />;
      case 'subjects':
        return <SubjectListPage />;
      case 'documents':
        return <DocumentsPage />;
      case 'notes':
        return <NotesPage />;
      case 'flashcards':
        return <FlashcardsPage />;
      case 'questions':
        return <QuestionBankPage />;
      case 'mistakes':
        return <MistakeLogbookPage />;
      case 'exams':
        return <ExamsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'ai':
        return <AIAssistantPage />;
      case 'profile':
        return <ProfilePage />;
      case 'settings':
        return <SettingsPage />;
      case 'admin':
        return <AdminDashboardPage />;
      default:
        return <DashboardPage />;
    }
  };

  return <AppLayout>{renderActiveView()}</AppLayout>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <StudyProvider>
          <AppContent />
        </StudyProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
