import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Bot,
  Calendar,
  Command,
  FileCheck,
  FileText,
  HelpCircle,
  Layers,
  Search,
  X
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { NavigationTab, SearchResultItem } from '../../types/common';
import { Badge } from '../common/Badge';

export const CommandPalette: React.FC = () => {
  const { isCommandPaletteOpen, setIsCommandPaletteOpen, globalSearchItems, navigateTo } = useStudy();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen]);

  const categories = [
    { id: 'all', label: 'Tất cả' },
    { id: 'subjects', label: 'Môn học' },
    { id: 'documents', label: 'Tài liệu' },
    { id: 'notes', label: 'Ghi chú' },
    { id: 'flashcards', label: 'Flashcard' },
    { id: 'questions', label: 'Câu hỏi' },
    { id: 'mistakes', label: 'Sổ lỗi sai' },
    { id: 'exams', label: 'Đề thi' },
    { id: 'ai', label: 'Trợ lý AI' },
    { id: 'schedule', label: 'Lịch học' },
  ];

  const filteredItems = useMemo(() => {
    let list = globalSearchItems;
    if (activeCategory !== 'all') {
      list = list.filter(item => item.category === activeCategory);
    }
    if (!query.trim()) return list.slice(0, 15);

    const q = query.toLowerCase().trim();
    return list
      .filter(item => item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q))
      .slice(0, 20);
  }, [globalSearchItems, activeCategory, query]);

  const handleSelect = (item: SearchResultItem) => {
    navigateTo(item.routeTarget.tab, item.routeTarget.id);
    setIsCommandPaletteOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isCommandPaletteOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1 < filteredItems.length ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, filteredItems, selectedIndex]);

  if (!isCommandPaletteOpen) return null;

  const getCategoryIcon = (category: NavigationTab) => {
    switch (category) {
      case 'subjects': return <BookOpen className="w-4 h-4 text-indigo-500" />;
      case 'documents': return <FileText className="w-4 h-4 text-sky-500" />;
      case 'notes': return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'flashcards': return <Layers className="w-4 h-4 text-amber-500" />;
      case 'questions': return <HelpCircle className="w-4 h-4 text-purple-500" />;
      case 'mistakes': return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'exams': return <FileCheck className="w-4 h-4 text-indigo-500" />;
      case 'ai': return <Bot className="w-4 h-4 text-violet-500" />;
      case 'schedule': return <Calendar className="w-4 h-4 text-orange-500" />;
      default: return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20 flex justify-center items-start animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCommandPaletteOpen(false)}
      />

      {/* Palette Box */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 gap-3">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            autoFocus
            placeholder="Tìm kiếm môn học, tài liệu, ghi chú, flashcard, đề thi..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
            ESC để đóng
          </span>
        </div>

        {/* Category Filters Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setSelectedIndex(0);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1 divide-y divide-transparent">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Không tìm thấy kết quả nào cho "{query}"
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Thử tìm với từ khóa khác hoặc chuyển danh mục bộ lọc
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 shadow-xs">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate">{item.title}</span>
                        <Badge size="sm" variant="neutral">
                          {item.badge}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 flex-shrink-0 transition-transform ${
                      isSelected
                        ? 'text-indigo-600 dark:text-indigo-400 translate-x-1'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 mr-1">↑</kbd>
              <kbd className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 mr-1">↓</kbd>
              Di chuyển
            </span>
            <span>
              <kbd className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 mr-1">Enter</kbd>
              Mở
            </span>
          </div>
          <span className="text-indigo-600 dark:text-indigo-400 font-medium">
            StudyOS Quick Command
          </span>
        </div>
      </div>
    </div>
  );
};
