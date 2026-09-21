import React, { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import {
  Bot,
  Check,
  Copy,
  Edit2,
  FileText,
  HelpCircle,
  Layers,
  Menu,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
  Wifi,
  X,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { useToast } from '../../context/ToastContext';
import { aiService } from '../../services/aiService';
import { documentService } from '../../services/documentService';
import { flashcardService } from '../../services/flashcardService';
import { noteService } from '../../services/noteService';
import { questionService } from '../../services/questionService';
import {
  AIConversation,
  AIMessage,
  AIMode,
  AIProvider,
  AISettingsState,
  AttachedStudyFile,
  SourceCitation,
} from '../../types/ai';
import { DocumentItem } from '../../types/document';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { SearchInput } from '../../components/common/SearchInput';
import { Select } from '../../components/common/Select';
import { GenerationPreviewModal, GenerationTargetType } from '../../components/ai/GenerationPreviewModal';
import { SourceCitationCard } from '../../components/ai/SourceCitationCard';
import { AISettingsModal } from './AISettingsModal';

export const AIAssistantPage: React.FC = () => {
  const { dataVersion, triggerDataRefresh } = useStudy();
  const toast = useToast();

  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AISettingsState | null>(null);
  const [allDocs, setAllDocs] = useState<DocumentItem[]>([]);

  // Input & Streaming states
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingDelta, setStreamingDelta] = useState('');
  const [streamingCitations, setStreamingCitations] = useState<SourceCitation[]>([]);
  const [searchConvQuery, setSearchConvQuery] = useState('');
  const [selectedAttachedDocs, setSelectedAttachedDocs] = useState<AttachedStudyFile[]>([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals & Draft Generation
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [convToRename, setConvToRename] = useState<AIConversation | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [convToDelete, setConvToDelete] = useState<AIConversation | null>(null);

  // Generation Preview State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTargetType, setPreviewTargetType] = useState<GenerationTargetType>('flashcards');
  const [previewDraftData, setPreviewDraftData] = useState<any>(null);
  const [isDrafting, setIsDrafting] = useState(false);

  // References
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadData = async () => {
    const [convList, settings, docs] = await Promise.all([
      aiService.getConversations(),
      aiService.getSettings(),
      documentService.getAllDocuments(),
    ]);

    setConversations(convList);
    setAiSettings(settings);
    setAllDocs(docs.filter(d => d.type !== 'folder'));

    if (!activeConvId && convList.length > 0) {
      setActiveConvId(convList[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, [dataVersion]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeConvId, isGenerating, streamingDelta]);

  const activeConversation = conversations.find(c => c.id === activeConvId);

  // New Conversation
  const handleNewConversation = async (mode: AIMode = 'general') => {
    const created = await aiService.createConversation('Cuộc trò chuyện mới', mode);
    setActiveConvId(created.id);
    triggerDataRefresh();
  };

  // Stop Generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    toast.info('Đã dừng tạo câu trả lời.');
  };

  // Send message with Real Streaming SSE
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeConvId || isGenerating) return;

    const textToSend = inputText.trim();
    const files = [...selectedAttachedDocs];

    setInputText('');
    setSelectedAttachedDocs([]);
    setIsGenerating(true);
    setStreamingDelta('');
    setStreamingCitations([]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await aiService.sendMessageStream(
        activeConvId,
        textToSend,
        files,
        activeConversation?.mode || 'general',
        delta => {
          setStreamingDelta(prev => {
            if (delta.startsWith(prev) && prev.length > 0) {
              return delta;
            }
            return prev + delta;
          });
        },
        meta => {
          if (meta.citations) {
            setStreamingCitations(meta.citations);
          }
        },
        abortController.signal
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error('Lỗi khi gửi tin nhắn tới AI', err.message);

        if (activeConversation) {
          const errorMsg: AIMessage = {
            id: `msg-err-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ **Không thể hoàn tất phản hồi từ AI**: ${err.message}\n\n👉 *Vui lòng kiểm tra lại API Key hoặc đổi mô hình trong **Cài đặt AI** (biểu tượng ⚙️ ở cột bên trái) để tiếp tục.*`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          activeConversation.messages.push(errorMsg);
          activeConversation.updatedAt = new Date().toISOString();
          await aiService.saveConversation(activeConversation);
          triggerDataRefresh();
        }
      }
    } finally {
      abortControllerRef.current = null;
      // Tải conversations mới TRƯỚC khi xóa streamingDelta,
      // để React batch 2 state updates thành 1 render duy nhất,
      // tránh frame trắng khi streamingDelta="" nhưng conversations chưa có msg mới
      let updatedList: AIConversation[] | null = null;
      try {
        updatedList = await aiService.getConversations();
      } catch {
        // ignore
      }
      setIsGenerating(false);
      setStreamingDelta('');
      setStreamingCitations([]);
      if (updatedList) {
        setConversations(updatedList);
      }
    }
  };

  // Regenerate Response
  const handleRegenerate = async () => {
    if (!activeConversation || isGenerating) return;
    const msgs = activeConversation.messages;
    const lastUserIdx = [...msgs].map(m => m.role).lastIndexOf('user');
    if (lastUserIdx === -1) return;

    const lastUserMsg = msgs[lastUserIdx];
    // Remove messages after last user message
    activeConversation.messages = msgs.slice(0, lastUserIdx);

    setInputText(lastUserMsg.content);
    if (lastUserMsg.attachedFiles) {
      setSelectedAttachedDocs(lastUserMsg.attachedFiles);
    }
    toast.info('Đã tải lại câu hỏi trước đó. Nhấn Gửi để tạo lại.');
  };

  // Change AI Mode for active conversation
  const handleModeChange = async (newMode: AIMode) => {
    if (!activeConversation) return;
    activeConversation.mode = newMode;
    await aiService.saveConversation(activeConversation);
    toast.info('Đã đổi chế độ AI', newMode.toUpperCase());
    triggerDataRefresh();
  };

  // Rename Conversation
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convToRename || !renameTitle.trim()) return;
    await aiService.renameConversation(convToRename.id, renameTitle.trim());
    toast.success('Đã đổi tên cuộc trò chuyện');
    setConvToRename(null);
    triggerDataRefresh();
  };

  // Delete Conversation
  const handleDeleteConvConfirm = async () => {
    if (!convToDelete) return;
    await aiService.deleteConversation(convToDelete.id);
    toast.success('Đã xóa cuộc trò chuyện');
    if (activeConvId === convToDelete.id) {
      const remaining = conversations.filter(c => c.id !== convToDelete.id);
      setActiveConvId(remaining[0]?.id || null);
    }
    setConvToDelete(null);
    triggerDataRefresh();
  };

  // Copy message
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Đã sao chép nội dung tin nhắn');
  };

  // Attach Document and Trigger Automatic RAG Indexing
  const handleToggleDocAttachment = async (doc: DocumentItem) => {
    const isAttached = selectedAttachedDocs.some(d => d.id === doc.id);
    if (isAttached) {
      setSelectedAttachedDocs(prev => prev.filter(d => d.id !== doc.id));
    } else {
      setSelectedAttachedDocs(prev => [
        ...prev,
        {
          id: doc.id,
          name: doc.name,
          type: doc.type,
          size: doc.size || 1024,
        },
      ]);

      // Trigger RAG indexing in background if document has text content
      try {
        const textContent = doc.content || `Tài liệu: ${doc.name}\nMôn học liên kết: ${doc.subjectId || 'Chung'}`;
        const base64 = btoa(unescape(encodeURIComponent(textContent)));
        await aiService.indexDocumentForRAG(doc.id, doc.name, doc.type, base64);
        toast.info('Đã lập chỉ mục RAG cho tài liệu', doc.name);
      } catch {
        // Silently continue
      }
    }
  };

  // Trigger Study Draft Generation (Flashcards, Questions, Notes)
  const handleTriggerDraftGeneration = async (
    targetType: GenerationTargetType,
    contextContent: string
  ) => {
    setIsDrafting(true);
    try {
      toast.info('Đang sinh dữ liệu học tập thông minh...', 'Vui lòng đợi giây lát');
      const draft = await aiService.generateStudyDraft(
        targetType,
        contextContent,
        5,
        'Tổng hợp',
        'medium'
      );
      setPreviewTargetType(targetType);
      setPreviewDraftData(draft);
      setPreviewModalOpen(true);
    } catch (err: any) {
      toast.error('Lỗi khi sinh nội dung dự thảo', err.message);
    } finally {
      setIsDrafting(false);
    }
  };

  // Save confirmed items to Real Database Services
  const handleSaveConfirmedItems = async (items: any[]) => {
    try {
      if (previewTargetType === 'flashcards') {
        const decks = await flashcardService.getDecks();
        const targetDeck = decks[0];
        if (!targetDeck) {
          toast.error('Chưa có bộ thẻ Flashcard nào. Hãy tạo bộ thẻ trước.');
          return;
        }

        for (const item of items) {
          await flashcardService.saveCard({
            deckId: targetDeck.id,
            front: item.front,
            back: item.back,
            hint: item.hint,
            difficulty: item.difficulty || 'medium',
            state: 'new',
            repetitionCount: 0,
            intervalDays: 0,
            nextReviewDate: new Date().toISOString().slice(0, 10),
          });
        }
        toast.success(`Đã lưu thành công ${items.length} thẻ Flashcard vào bộ "${targetDeck.title}"!`);
      } else if (previewTargetType === 'questions') {
        for (const item of items) {
          await questionService.saveQuestion({
            content: item.content,
            subjectId: 'subj-1',
            options: item.options || [
              { id: 'opt-1', text: 'Phương án A' },
              { id: 'opt-2', text: 'Phương án B' },
            ],
            correctOptionId: item.correctOptionId || 'opt-1',
            explanation: item.explanation || '',
            difficulty: item.difficulty || 'medium',
            type: 'single_choice',
            tags: ['AI-Generated'],
          });
        }
        toast.success(`Đã lưu thành công ${items.length} câu hỏi vào Ngân hàng câu hỏi!`);
      } else if (previewTargetType === 'notes') {
        for (const item of items) {
          await noteService.saveNote({
            title: item.title || 'Ghi chú AI',
            content: item.contentMarkdown || '',
            tags: item.tags || ['AI-Generated'],
            isPinned: false,
            isFavorite: false,
          });
        }
        toast.success(`Đã lưu bản ghi chú vào Thư viện Ghi chú!`);
      }

      triggerDataRefresh();
    } catch (err: any) {
      toast.error('Lỗi khi lưu dữ liệu vào hệ thống', err.message);
    }
  };

  // Safe KaTeX Rendering helper
  const renderMathContent = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g);

    return parts.map((part, idx) => {
      // Stable key: combine index + first 8 chars to avoid React reconciliation issues during streaming
      const stableKey = `${idx}-${part.slice(0, 8)}`;

      if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
        const math = part.slice(2, -2);
        try {
          const html = katex.renderToString(math, { displayMode: true, throwOnError: false, output: 'html' });
          return <div key={stableKey} className="my-2.5 overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <code key={stableKey} className="block my-2 text-rose-500">{part}</code>;
        }
      } else if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        const math = part.slice(1, -1);
        try {
          const html = katex.renderToString(math, { displayMode: false, throwOnError: false, output: 'html' });
          return <span key={stableKey} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <code key={stableKey} className="text-rose-500">{part}</code>;
        }
      }
      return <span key={stableKey}>{part}</span>;
    });
  };

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchConvQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col md:flex-row gap-4 animate-in fade-in duration-150 relative">
      {/* MOBILE BACKDROP OVERLAY */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* CONVERSATIONS SIDEBAR (Responsive: Drawer on mobile, Sidebar on desktop) */}
      <div
        className={`${
          isMobileSidebarOpen
            ? 'fixed inset-y-0 left-0 w-80 max-w-[85vw] z-50 flex shadow-2xl border-r'
            : 'hidden md:flex md:w-80 md:static shadow-xs border'
        } flex-shrink-0 flex-col bg-white dark:bg-slate-900 md:rounded-2xl border-slate-200 dark:border-slate-800 p-3.5 transition-all duration-200`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Trợ lý StudyOS AI
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAiSettingsOpen(true)}
              className="p-1.5 h-auto text-slate-500"
              title="Cấu hình mô hình AI"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 md:hidden rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Đóng danh sách"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="w-full mb-3 justify-center"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            handleNewConversation();
            setIsMobileSidebarOpen(false);
          }}
        >
          Cuộc trò chuyện mới
        </Button>

        <div className="mb-2">
          <SearchInput
            placeholder="Tìm cuộc hội thoại..."
            value={searchConvQuery}
            onChange={setSearchConvQuery}
          />
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {filteredConversations.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Không tìm thấy cuộc trò chuyện nào.
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isActive = conv.id === activeConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors group flex items-center justify-between ${
                    isActive
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="min-w-0 pr-2 flex-1">
                    <h5 className="font-semibold truncate text-xs">{conv.title}</h5>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                      <span className="uppercase font-mono">{conv.mode}</span>
                      <span>•</span>
                      <span>{conv.messages.length} tin</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setConvToRename(conv);
                        setRenameTitle(conv.title);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-indigo-600"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setConvToDelete(conv);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT MAIN: Active Chat Window */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Chat Header Bar */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {activeConversation?.title || 'Trợ lý học tập'}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="primary" size="sm">
                  Chế độ: {(activeConversation?.mode || 'general').toUpperCase()}
                </Badge>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  ⚡ Google Gemini ({aiSettings?.providers?.google?.model || 'gemini-3.8-flash'})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden text-xs"
              leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
            >
              Hội thoại ({conversations.length})
            </Button>
            <Select
              value={activeConversation?.mode || 'general'}
              onChange={e => handleModeChange(e.target.value as AIMode)}
              options={[
                { value: 'general', label: 'General (Tổng quan)' },
                { value: 'study', label: 'Study (Gia sư học tập)' },
                { value: 'document', label: 'Document (Hỏi đáp RAG)' },
                { value: 'question', label: 'Question (Phân tích câu hỏi)' },
                { value: 'flashcard', label: 'Flashcard (Tạo thẻ nhớ)' },
                { value: 'quiz', label: 'Quiz (Thi thử trắc nghiệm)' },
                { value: 'summarize', label: 'Summarize (Tóm tắt cốt lõi)' },
              ]}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="text-xs"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Tạo lại
            </Button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeConversation || activeConversation.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Bot className="w-12 h-12 mb-3 text-indigo-500/40 animate-bounce" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                StudyOS AI đã sẵn sàng hỗ trợ bạn
              </h4>
              <p className="text-xs max-w-md mt-1 leading-relaxed">
                Bạn có thể đặt câu hỏi về mọi môn học, đính kèm tài liệu PDF/Word để RAG trích xuất, hoặc yêu cầu AI tự động soạn bộ thẻ Flashcard và câu hỏi trắc nghiệm!
              </p>
            </div>
          ) : (
            activeConversation.messages.map(msg => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 border border-indigo-100 dark:border-indigo-900/50">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[75%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                    {/* Attached files preview in message */}
                    {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {msg.attachedFiles.map(f => (
                          <span
                            key={f.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 text-[10px]"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{f.name}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`p-4 rounded-2xl ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-tr-xs shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs shadow-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                        {renderMathContent(msg.content)}
                      </div>

                      {/* Source Citation Card */}
                      {msg.citations && msg.citations.length > 0 && (
                        <SourceCitationCard citations={msg.citations} />
                      )}
                    </div>

                    {/* Metadata & Quick Action Tools */}
                    <div
                      className={`flex flex-wrap items-center gap-2 text-[10px] text-slate-400 px-1 ${
                        isUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <span>{msg.timestamp}</span>

                      {msg.routingMeta && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                          {msg.routingMeta.providerId.toUpperCase()} ({msg.routingMeta.model})
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.content)}
                        className="hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1"
                        title="Sao chép"
                      >
                        <Copy className="w-3 h-3" />
                      </button>

                      {/* AI Quick Study Generation Shortcuts */}
                      {!isUser && (
                        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => handleTriggerDraftGeneration('flashcards', msg.content)}
                            disabled={isDrafting}
                            className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-[10px] font-medium flex items-center gap-1 transition-colors"
                          >
                            <Layers className="w-3 h-3" />
                            <span>Tạo Flashcard</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTriggerDraftGeneration('questions', msg.content)}
                            disabled={isDrafting}
                            className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 text-[10px] font-medium flex items-center gap-1 transition-colors"
                          >
                            <HelpCircle className="w-3 h-3" />
                            <span>Tạo Trắc nghiệm</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTriggerDraftGeneration('notes', msg.content)}
                            disabled={isDrafting}
                            className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 text-[10px] font-medium flex items-center gap-1 transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Tạo Ghi chú</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 shadow-xs">
                      NL
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Active Streaming Token Render */}
          {isGenerating && streamingDelta && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 border border-indigo-100 dark:border-indigo-900/50">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs shadow-xs">
                {/* Plain text render during stream — tránh React key instability do KaTeX split gây lặp text */}
                <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                  {streamingDelta}
                </div>
                {streamingCitations.length > 0 && (
                  <SourceCitationCard citations={streamingCitations} />
                )}
              </div>
            </div>
          )}

          {isGenerating && !streamingDelta && (
            <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse">
              <Bot className="w-4 h-4 text-indigo-500 animate-spin" />
              <span>StudyOS AI đang tổng hợp dữ liệu và suy luận câu trả lời...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Attached Files Bar */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          {/* Selected Attached Files preview */}
          {selectedAttachedDocs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {selectedAttachedDocs.map(f => (
                <span
                  key={f.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs"
                >
                  <Paperclip className="w-3 h-3" />
                  <span className="truncate max-w-xs">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedAttachedDocs(prev => prev.filter(item => item.id !== f.id))}
                    className="hover:text-rose-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setIsAttachModalOpen(true)}
              className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
              title="Đính kèm tài liệu học tập (RAG)"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <textarea
              rows={2}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Hỏi trợ lý AI trong chế độ ${(activeConversation?.mode || 'GENERAL').toUpperCase()}... (Enter để gửi)`}
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />

            {isGenerating ? (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleStopGeneration}
                className="flex-shrink-0 text-xs"
                leftIcon={<Square className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />}
              >
                Dừng
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!inputText.trim()}
                className="flex-shrink-0"
                aria-label="Gửi tin nhắn"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </form>
        </div>
      </div>

      {/* Attach Document Context Modal (RAG) */}
      <Modal
        isOpen={isAttachModalOpen}
        onClose={() => setIsAttachModalOpen(false)}
        title="Đính kèm tài liệu học tập (RAG Context)"
        description="Chọn các tài liệu từ Thư viện để AI tra cứu, trích xuất và đối chiếu câu trả lời"
        size="lg"
        footer={
          <div className="w-full flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setIsAttachModalOpen(false)}>
              Hoàn tất chọn ({selectedAttachedDocs.length} tài liệu)
            </Button>
          </div>
        }
      >
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {allDocs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Thư viện chưa có tài liệu nào. Bạn có thể tải tài liệu lên ở mục Tài liệu.
            </div>
          ) : (
            allDocs.map(doc => {
              const isAttached = selectedAttachedDocs.some(d => d.id === doc.id);
              return (
                <div
                  key={doc.id}
                  onClick={() => handleToggleDocAttachment(doc)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                    isAttached
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-900 text-indigo-900 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <h5 className="font-semibold truncate">{doc.name}</h5>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">{doc.type}</span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                    isAttached ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {isAttached && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Modal>

      {/* AI Settings Modal */}
      <AISettingsModal
        isOpen={isAiSettingsOpen}
        onClose={() => setIsAiSettingsOpen(false)}
        onSettingsSaved={() => {
          loadData();
          toast.success('Đã cập nhật cấu hình mô hình AI');
        }}
      />

      {/* Generation Preview Modal (Flashcards, Questions, Notes) */}
      <GenerationPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        targetType={previewTargetType}
        draftData={previewDraftData}
        onSaveConfirmed={handleSaveConfirmedItems}
      />

      {/* Rename Conversation Modal */}
      <Modal
        isOpen={!!convToRename}
        onClose={() => setConvToRename(null)}
        title="Đổi tên cuộc trò chuyện"
        size="sm"
        footer={
          <div className="w-full flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConvToRename(null)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={handleRenameSubmit}>Lưu tên</Button>
          </div>
        }
      >
        <form onSubmit={handleRenameSubmit}>
          <Input
            label="Tiêu đề cuộc trò chuyện"
            value={renameTitle}
            onChange={e => setRenameTitle(e.target.value)}
            autoFocus
          />
        </form>
      </Modal>

      {/* Delete Conversation Confirmation */}
      <ConfirmDialog
        isOpen={!!convToDelete}
        onClose={() => setConvToDelete(null)}
        onConfirm={handleDeleteConvConfirm}
        title="Xóa cuộc trò chuyện?"
        message={`Bạn có chắc chắn muốn xóa vĩnh viễn cuộc trò chuyện "${convToDelete?.title}" không? Hành động này không thể hoàn tác.`}
        confirmText="Xóa cuộc trò chuyện"
        isDestructive={true}
      />
    </div>
  );
};
