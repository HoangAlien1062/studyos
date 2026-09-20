export type ThemeMode = 'light' | 'dark' | 'system';

export type NavigationTab =
  | 'dashboard'
  | 'schedule'
  | 'subjects'
  | 'documents'
  | 'notes'
  | 'flashcards'
  | 'questions'
  | 'mistakes'
  | 'exams'
  | 'analytics'
  | 'ai'
  | 'settings'
  | 'profile';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: NavigationTab;
  badge: string;
  routeTarget: {
    tab: NavigationTab;
    id?: string;
  };
}
