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

const AppContent: React.FC = () => {
  const { activeTab } = useStudy();

  const renderActiveView = () => {
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
