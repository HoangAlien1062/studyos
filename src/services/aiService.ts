/**
 * StudyOS Frontend AI Service (Part 4)
 * Communicates with the secure backend AI proxy (/api/ai/*)
 * Supports Streaming SSE, Multi-Provider Auto-Routing, RAG, and Draft Generation.
 */

import { INITIAL_AI_SETTINGS, INITIAL_CONVERSATIONS } from '../data/initialAISettings';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  AIConversation,
  AIMessage,
  AIMode,
  AIProvider,
  AISettingsState,
  AttachedStudyFile,
  SourceCitation,
} from '../types/ai';
import { storage } from './storage';

const AI_SETTINGS_KEY = 'ai_settings';
const AI_CONVERSATIONS_KEY = 'ai_conversations';

export const aiService = {
  // === SETTINGS & PROVIDER MANAGEMENT ===
  async getSettings(): Promise<AISettingsState> {
    const local = storage.get<AISettingsState>(AI_SETTINGS_KEY, INITIAL_AI_SETTINGS);

    // Auto-upgrade legacy / deprecated model names in local storage
    if (local?.providers?.google?.model) {
      const gModel = local.providers.google.model;
      if (
        gModel === 'gemini-2.0-flash' ||
        gModel === 'gemini-2.0-flash-exp' ||
        gModel.startsWith('gemini-1.5') ||
        gModel === 'gemini-pro'
      ) {
        local.providers.google.model = 'gemini-3.6-flash';
        storage.set(AI_SETTINGS_KEY, local);
      }
    }

    // Fetch live status and masked keys from backend
    try {
      const res = await fetch('/api/ai/providers');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.providers)) {
          for (const sp of data.providers) {
            const pId = sp.id as AIProvider;
            if (local.providers[pId]) {
              local.providers[pId] = {
                ...local.providers[pId],
                isEnabled: sp.isEnabled,
                model: sp.model,
                baseUrl: sp.baseUrl,
                status: sp.status,
                lastPingMs: sp.lastPingMs,
                maskedApiKey: sp.maskedApiKey,
                isConfigured: sp.isConfigured,
              };
            }
          }
        }
      }
    } catch {
      // Backend not yet reached or offline fallback
    }

    return local;
  },

  async saveSettings(settings: AISettingsState): Promise<AISettingsState> {
    storage.set(AI_SETTINGS_KEY, settings);

    // Sync provider configs to backend server
    try {
      for (const [pId, config] of Object.entries(settings.providers)) {
        if (pId === 'auto') continue;
        await fetch('/api/ai/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: pId,
            apiKey: config.apiKey,
            model: config.model,
            baseUrl: config.baseUrl,
            isEnabled: config.isEnabled,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            priority: config.priority,
          }),
        });
      }
    } catch (err) {
      console.warn('[AI Service] Failed to sync settings with backend:', err);
    }

    return settings;
  },

  async testConnection(providerId: AIProvider): Promise<{ success: boolean; latencyMs: number; message: string }> {
    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
      });

      if (res.ok) {
        return await res.json();
      }
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        latencyMs: 0,
        message: err.error || `Lỗi máy chủ khi kiểm tra kết nối (${res.status}).`,
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: 0,
        message: err.message || 'Không thể kết nối tới máy chủ backend StudyOS AI.',
      };
    }
  },

  // === CONVERSATION PERSISTENCE ===
  async getConversations(): Promise<AIConversation[]> {
    if (supabase && isSupabaseConfigured) {
      try {
        const { data: convData, error } = await supabase
          .from('ai_conversations')
          .select('*')
          .order('updated_at', { ascending: false });

        if (!error && convData && convData.length > 0) {
          const { data: msgsData } = await supabase
            .from('ai_messages')
            .select('*')
            .order('created_at', { ascending: true });

          const mapped: AIConversation[] = convData.map(c => {
            const msgs = msgsData?.filter(m => m.conversation_id === c.id) || [];
            return {
              id: c.id,
              title: c.title,
              mode: c.mode as AIMode,
              createdAt: c.created_at,
              updatedAt: c.updated_at,
              messages: msgs.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: m.timestamp_str,
                attachedFiles: m.attached_files || [],
              })),
            };
          });
          storage.set(AI_CONVERSATIONS_KEY, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[Supabase Online] Error loading conversations:', err);
      }
    }
    const list = storage.get<AIConversation[]>(AI_CONVERSATIONS_KEY, INITIAL_CONVERSATIONS);
    for (const c of list) {
      for (const m of c.messages) {
        if (m.content === 'Đã hoàn thành phản hồi.') {
          m.content = '⚠️ Phản hồi bị gián đoạn do chưa cấu hình Google API Key. Vui lòng bấm vào biểu tượng ⚙️ (Cài đặt AI ở góc trái) để nhập API Key và tiếp tục!';
        }
      }
    }
    return list;
  },

  async getConversationById(id: string): Promise<AIConversation | undefined> {
    const list = await this.getConversations();
    return list.find(c => c.id === id);
  },

  async createConversation(title?: string, mode: AIMode = 'general'): Promise<AIConversation> {
    const list = await this.getConversations();
    const now = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newConv: AIConversation = {
      id: `conv-${Date.now()}`,
      title: title || 'Cuộc trò chuyện mới',
      mode,
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content:
            'Xin chào! Mình là trợ lý học tập AI của StudyOS. Mình có thể giúp bạn giải toán, giải thích code thuật toán, tóm tắt tài liệu, hoặc soạn đề ôn tập. Hãy nhập câu hỏi của bạn nhé!',
          timestamp: timeStr,
        },
      ],
    };

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('ai_conversations').insert({
          id: newConv.id,
          title: newConv.title,
          mode: newConv.mode,
        });
        await supabase.from('ai_messages').insert({
          id: newConv.messages[0].id,
          conversation_id: newConv.id,
          role: 'assistant',
          content: newConv.messages[0].content,
          timestamp_str: timeStr,
        });
      } catch (err) {
        console.warn('[Supabase Online] Error creating conversation:', err);
      }
    }

    list.unshift(newConv);
    storage.set(AI_CONVERSATIONS_KEY, list);
    return newConv;
  },

  async saveConversation(conv: AIConversation): Promise<AIConversation> {
    const list = await this.getConversations();
    const idx = list.findIndex(c => c.id === conv.id);
    if (idx !== -1) {
      list[idx] = { ...conv, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(conv);
    }
    storage.set(AI_CONVERSATIONS_KEY, list);
    return conv;
  },

  async deleteConversation(id: string): Promise<boolean> {
    const list = await this.getConversations();
    storage.set(AI_CONVERSATIONS_KEY, list.filter(c => c.id !== id));

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('ai_conversations').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error deleting conversation:', err);
      }
    }

    return true;
  },

  async renameConversation(id: string, newTitle: string): Promise<AIConversation | undefined> {
    const list = await this.getConversations();
    const target = list.find(c => c.id === id);
    if (!target) return undefined;
    target.title = newTitle;
    target.updatedAt = new Date().toISOString();
    storage.set(AI_CONVERSATIONS_KEY, list);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('ai_conversations').update({ title: newTitle }).eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error renaming conversation:', err);
      }
    }

    return target;
  },

  // === REAL CHAT STREAMING WITH BACKEND ===
  async sendMessageStream(
    convId: string,
    userText: string,
    attachedFiles: AttachedStudyFile[] = [],
    mode: AIMode = 'general',
    onTokenChunk: (delta: string) => void,
    onMetadata?: (meta: { citations?: SourceCitation[]; providerId?: string; model?: string }) => void,
    abortSignal?: AbortSignal
  ): Promise<{ userMsg: AIMessage; assistantMsg: AIMessage }> {
    const list = await this.getConversations();
    const conv = list.find(c => c.id === convId);
    if (!conv) throw new Error('Conversation not found');

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: AIMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: nowStr,
      attachedFiles,
    };
    conv.messages.push(userMsg);

    // Auto title from first user query
    if (conv.messages.filter(m => m.role === 'user').length === 1) {
      conv.title = userText.slice(0, 32) + (userText.length > 32 ? '...' : '');
    }

    // Call Backend Streaming Endpoint
    const settings = await this.getSettings();
    const activeProvider = settings.providers[settings.primaryProvider];
    const attachedDocumentIds = attachedFiles.map(f => f.id);

    const payload = {
      messages: conv.messages.map(m => ({ role: m.role, content: m.content })),
      mode,
      preferredProvider: settings.primaryProvider,
      providerApiKey: activeProvider?.apiKey,
      providerModel: activeProvider?.model,
      attachedDocumentIds,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      stream: true,
    };

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: abortSignal,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Lỗi AI (${res.status})`);
    }

    if (!res.body) throw new Error('Phản hồi không có body');

    let fullAiContent = '';
    let citations: SourceCitation[] = [];
    let providerId: string | undefined;
    let model: string | undefined;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') continue;

          let ev: any;
          try {
            ev = JSON.parse(dataStr);
          } catch {
            continue;
          }

          if (ev.type === 'meta') {
            citations = ev.citations || [];
            if (onMetadata) onMetadata({ citations });
          } else if (ev.type === 'chunk') {
            console.debug('[SSE chunk]', JSON.stringify(ev.delta));
            fullAiContent += ev.delta;
            onTokenChunk(ev.delta);
          } else if (ev.type === 'final') {
            console.debug('[SSE final]', ev.providerId, ev.model);
            providerId = ev.providerId;
            model = ev.model;
            if (onMetadata) onMetadata({ citations, providerId, model });
          } else if (ev.type === 'error') {
            throw new Error(ev.error || 'Lỗi xử lý AI.');
          } else {
            console.debug('[SSE unknown event]', ev.type, ev);
          }
        }
      }
    } finally {
      reader.releaseLock();
      console.debug('[SSE stream done] fullAiContent length=', fullAiContent.length, 'preview=', fullAiContent.slice(0, 80));
    }

    if (!fullAiContent.trim()) {
      throw new Error('Mô hình AI không trả về nội dung nào. Vui lòng kiểm tra lại API Key hoặc cấu hình trong Cài đặt AI.');
    }

    const assistantMsg: AIMessage = {
      id: `msg-ai-${Date.now()}`,
      role: 'assistant',
      content: fullAiContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      citations,
      routingMeta: providerId && model ? { providerId: providerId as AIProvider, model } : undefined,
    };

    conv.messages.push(assistantMsg);
    conv.updatedAt = new Date().toISOString();

    // Supabase sync
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('ai_messages').insert([
          {
            id: userMsg.id,
            conversation_id: convId,
            role: 'user',
            content: userMsg.content,
            timestamp_str: userMsg.timestamp,
          },
          {
            id: assistantMsg.id,
            conversation_id: convId,
            role: 'assistant',
            content: assistantMsg.content,
            timestamp_str: assistantMsg.timestamp,
          },
        ]);
      } catch (err) {
        console.warn('[Supabase Online] Error syncing messages:', err);
      }
    }

    storage.set(AI_CONVERSATIONS_KEY, list);
    return { userMsg, assistantMsg };
  },

  // Fallback / legacy non-streaming
  async sendMessage(
    convId: string,
    userText: string,
    attachedFiles?: AttachedStudyFile[],
    mode: AIMode = 'general'
  ): Promise<{ userMsg: AIMessage; assistantMsg: AIMessage }> {
    return this.sendMessageStream(convId, userText, attachedFiles, mode, () => {});
  },

  // === RAG DOCUMENT INGESTION ===
  async indexDocumentForRAG(
    documentId: string,
    documentName: string,
    fileType: string,
    fileBase64: string
  ): Promise<{ success: boolean; chunkCount: number; wordCount: number }> {
    const res = await fetch('/api/ai/rag/process-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId,
        documentName,
        fileType,
        fileBase64,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Lỗi khi lập chỉ mục tài liệu RAG.');
    }

    return await res.json();
  },

  // === STRUCTURED GENERATION FOR PREVIEW ===
  async generateStudyDraft(
    targetType: 'flashcards' | 'questions' | 'notes',
    prompt: string,
    count = 5,
    subjectName?: string,
    difficulty = 'medium'
  ): Promise<any> {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetType,
        prompt,
        count,
        subjectName,
        difficulty,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Lỗi khi tạo nội dung dự thảo.');
    }

    const data = await res.json();
    return data.draftData;
  },
};
