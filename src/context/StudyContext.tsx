import React, { createContext, useContext, useEffect, useState } from 'react';
import { NavigationTab, SearchResultItem } from '../types/common';
import { notificationService } from '../services/notificationService';
import { subjectService } from '../services/subjectService';
import { documentService } from '../services/documentService';
import { noteService } from '../services/noteService';
import { flashcardService } from '../services/flashcardService';
import { questionService } from '../services/questionService';
import { scheduleService } from '../services/scheduleService';
import { examService } from '../services/examService';
import { mistakeService } from '../services/mistakeService';
import { aiService } from '../services/aiService';

import { authService, UserAccount } from '../services/authService';

interface StudyContextType {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  selectedTargetId?: string;
  setSelectedTargetId: (id?: string) => void;
  navigateTo: (tab: NavigationTab, targetId?: string) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isNotificationDrawerOpen: boolean;
  setIsNotificationDrawerOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isAccountModalOpen: boolean;
  setIsAccountModalOpen: (open: boolean) => void;
  isAuthenticated: boolean;
  currentUser: UserAccount | null;
  unreadNotifsCount: number;
  refreshUnreadNotifs: () => Promise<void>;
  globalSearchItems: SearchResultItem[];
  refreshSearchIndex: () => Promise<void>;
  dataVersion: number;
  triggerDataRefresh: () => void;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [selectedTargetId, setSelectedTargetId] = useState<string | undefined>(undefined);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => !authService.isAuthenticated());
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => authService.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => authService.isAuthenticated());
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(2);
  const [globalSearchItems, setGlobalSearchItems] = useState<SearchResultItem[]>([]);
  const [dataVersion, setDataVersion] = useState<number>(0);

  const triggerDataRefresh = () => {
    setDataVersion(v => v + 1);
  };

  const navigateTo = (tab: NavigationTab, targetId?: string) => {
    setActiveTab(tab);
    setSelectedTargetId(targetId);
  };

  const refreshUnreadNotifs = async () => {
    const count = await notificationService.getUnreadCount();
    setUnreadNotifsCount(count);
  };

  const refreshSearchIndex = async () => {
    try {
      const [subjects, chapters, topics, docs, notes, decks, questions, schedules, exams, mistakes, conversations] = await Promise.all([
        subjectService.getSubjects(),
        subjectService.getChapters(),
        subjectService.getTopics(),
        documentService.getAllDocuments(),
        noteService.getAllNotes(),
        flashcardService.getDecks(),
        questionService.getQuestions(),
        scheduleService.getSchedules(),
        examService.getExams(),
        mistakeService.getMistakes(),
        aiService.getConversations(),
      ]);

      const items: SearchResultItem[] = [];

      subjects.forEach(s => {
        items.push({
          id: s.id,
          title: s.name,
          subtitle: `${s.code} • Tiến độ ${s.progress}%`,
          category: 'subjects',
          badge: 'Môn học',
          routeTarget: { tab: 'subjects', id: s.id }
        });
      });

      chapters.forEach(c => {
        items.push({
          id: c.id,
          title: c.title,
          subtitle: c.description,
          category: 'subjects',
          badge: 'Chương',
          routeTarget: { tab: 'subjects', id: c.subjectId }
        });
      });

      topics.forEach(t => {
        items.push({
          id: t.id,
          title: t.title,
          subtitle: t.description,
          category: 'subjects',
          badge: 'Chủ đề',
          routeTarget: { tab: 'subjects', id: t.subjectId }
        });
      });

      docs.forEach(d => {
        items.push({
          id: d.id,
          title: d.name,
          subtitle: `Loại: ${d.type.toUpperCase()}`,
          category: 'documents',
          badge: d.type === 'folder' ? 'Thư mục' : 'Tài liệu',
          routeTarget: { tab: 'documents', id: d.id }
        });
      });

      notes.forEach(n => {
        items.push({
          id: n.id,
          title: n.title,
          subtitle: `Ghi chú: ${n.tags.join(', ')}`,
          category: 'notes',
          badge: 'Ghi chú',
          routeTarget: { tab: 'notes', id: n.id }
        });
      });

      decks.forEach(dk => {
        items.push({
          id: dk.id,
          title: dk.title,
          subtitle: dk.description,
          category: 'flashcards',
          badge: 'Flashcard',
          routeTarget: { tab: 'flashcards', id: dk.id }
        });
      });

      questions.forEach((q) => {
        items.push({
          id: q.id,
          title: q.content.slice(0, 60) + (q.content.length > 60 ? '...' : ''),
          subtitle: `Độ khó: ${q.difficulty.toUpperCase()} • Nguồn: ${q.source || 'StudyOS'}`,
          category: 'questions',
          badge: 'Câu hỏi',
          routeTarget: { tab: 'questions', id: q.id }
        });
      });

      schedules.forEach(sc => {
        items.push({
          id: sc.id,
          title: `Lịch học: ${sc.subjectName}`,
          subtitle: `${sc.date} (${sc.startTime} - ${sc.endTime}) • ${sc.location}`,
          category: 'schedule',
          badge: 'Lịch học',
          routeTarget: { tab: 'schedule', id: sc.id }
        });
      });

      exams.forEach(ex => {
        items.push({
          id: ex.id,
          title: ex.title,
          subtitle: `${ex.subjectName} • ${ex.durationMinutes} phút`,
          category: 'exams',
          badge: 'Đề thi',
          routeTarget: { tab: 'exams', id: ex.id }
        });
      });

      mistakes.forEach(m => {
        items.push({
          id: m.id,
          title: m.questionContent.slice(0, 60) + (m.questionContent.length > 60 ? '...' : ''),
          subtitle: `Lỗi sai: ${m.reason} • Ôn tập: ${m.reviewCount} lần`,
          category: 'mistakes',
          badge: 'Sổ lỗi sai',
          routeTarget: { tab: 'mistakes', id: m.id }
        });
      });

      conversations.forEach(c => {
        items.push({
          id: c.id,
          title: c.title,
          subtitle: `Trợ lý AI (${c.mode}) • ${c.messages.length} tin nhắn`,
          category: 'ai',
          badge: 'Trợ lý AI',
          routeTarget: { tab: 'ai', id: c.id }
        });
      });

      setGlobalSearchItems(items);
    } catch (err) {
      console.warn('Failed to build search index', err);
    }
  };

  useEffect(() => {
    setCurrentUser(authService.getCurrentUser());
    setIsAuthenticated(authService.isAuthenticated());
    refreshUnreadNotifs();
    refreshSearchIndex();
  }, [dataVersion]);

  // Lắng nghe phím tắt Ctrl + K toàn cục
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <StudyContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedTargetId,
        setSelectedTargetId,
        navigateTo,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isNotificationDrawerOpen,
        setIsNotificationDrawerOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isAccountModalOpen,
        setIsAccountModalOpen,
        isAuthenticated,
        currentUser,
        unreadNotifsCount,
        refreshUnreadNotifs,
        globalSearchItems,
        refreshSearchIndex,
        dataVersion,
        triggerDataRefresh
      }}
    >
      {children}
    </StudyContext.Provider>
  );
};

export const useStudy = (): StudyContextType => {
  const context = useContext(StudyContext);
  if (!context) {
    throw new Error('useStudy must be used within a StudyProvider');
  }
  return context;
};
