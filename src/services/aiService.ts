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
    const list = storage.get<AIConversation[]>(AI_CONVERSATIONS_KEY, []);
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

  // === GEMINI DIRECT CLIENT STREAMING & KEY POOL TESTING ===
  async testGeminiKeys(rawKeys: string, model: string = 'gemini-3.6-flash'): Promise<{
    results: Array<{ keyMask: string; latencyMs: number; status: 'ok' | 'error'; message?: string }>;
    sortedKeys: string;
    fastestKey?: string;
  }> {
    const keys = rawKeys
      .split(/[\n,;]+/)
      .map(k => k.trim())
      .filter(k => k.length > 5);

    if (keys.length === 0) {
      return { results: [], sortedKeys: '' };
    }

    const cleanModel = (model || 'gemini-3.6-flash').trim();

    const testResults = await Promise.all(
      keys.map(async (key) => {
        const start = Date.now();
        const keyMask = `...${key.slice(-6)}`;
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
                generationConfig: { maxOutputTokens: 2, temperature: 0 },
              }),
            }
          );
          const latencyMs = Date.now() - start;
          if (res.ok) {
            return { key, keyMask, latencyMs, status: 'ok' as const };
          } else {
            const errData = await res.json().catch(() => ({}));
            return {
              key,
              keyMask,
              latencyMs,
              status: 'error' as const,
              message: errData?.error?.message || `HTTP ${res.status}`,
            };
          }
        } catch (e: any) {
          return {
            key,
            keyMask,
            latencyMs: Date.now() - start,
            status: 'error' as const,
            message: e?.message || 'Lỗi mạng',
          };
        }
      })
    );

    const valid = testResults.filter(r => r.status === 'ok').sort((a, b) => a.latencyMs - b.latencyMs);
    const failed = testResults.filter(r => r.status !== 'ok');
    const sortedKeyList = [...valid.map(r => r.key), ...failed.map(r => r.key)];

    return {
      results: [...valid, ...failed].map(({ keyMask, latencyMs, status, message }) => ({ keyMask, latencyMs, status, message })),
      sortedKeys: sortedKeyList.join('\n'),
      fastestKey: valid[0]?.keyMask,
    };
  },

  async streamDirectGoogle(
    conv: AIConversation,
    convId: string,
    userText: string,
    keyPool: string[],
    model: string,
    temperature: number,
    maxTokens: number,
    onTokenChunk: (delta: string) => void,
    onMetadata?: (meta: { citations?: SourceCitation[]; providerId?: string; model?: string }) => void,
    abortSignal?: AbortSignal
  ): Promise<{ userMsg: AIMessage; assistantMsg: AIMessage }> {
    const cleanModel = (model || 'gemini-3.6-flash').trim();
    const systemPrompt = 'Bạn là trợ lý học tập AI thông minh StudyOS, hỗ trợ học sinh và sinh viên giải bài tập, tóm tắt bài học, tạo câu hỏi ôn thi và giải thích kiến thức một cách chính xác, sư phạm và dễ hiểu.';

    const contents = conv.messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body = {
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: temperature ?? 0.7,
        maxOutputTokens: maxTokens ?? 2048,
      },
    };

    let res: Response | null = null;
    const maxAttempts = Math.min(keyPool.length, 4);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const currentKey = keyPool[attempt % keyPool.length];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:streamGenerateContent?alt=sse&key=${currentKey}`;

      try {
        const attemptRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: abortSignal,
        });

        if (!attemptRes.ok) {
          const errText = await attemptRes.text().catch(() => '');
          if ((attemptRes.status === 429 || attemptRes.status === 403) && attempt < maxAttempts - 1) {
            console.warn(`[Direct Gemini] Key ...${currentKey.slice(-6)} bị giới hạn tần suất (${attemptRes.status}). Tự động đổi key...`);
            continue;
          }
          throw new Error(`Google API lỗi (${attemptRes.status}): ${errText.slice(0, 120)}`);
        }

        res = attemptRes;
        break;
      } catch (err: any) {
        if (attempt < maxAttempts - 1 && (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED'))) {
          continue;
        }
        throw err;
      }
    }

    if (!res || !res.body) {
      throw new Error('Google Gemini không phản hồi nội dung stream');
    }

    if (onMetadata) {
      onMetadata({ providerId: 'google', model: cleanModel });
    }

    let fullAiContent = '';
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
          const jsonStr = trimmed.replace(/^data:\s*/, '');
          try {
            const parsed = JSON.parse(jsonStr);
            const rawDelta = parsed.candidates?.[0]?.content?.parts
              ?.filter((p: any) => !p.thought)
              ?.map((p: any) => p.text)
              ?.filter(Boolean)
              ?.join('') || '';

            if (rawDelta) {
              let delta = rawDelta;
              if (fullAiContent.length > 0 && delta.startsWith(fullAiContent)) {
                delta = delta.slice(fullAiContent.length);
              }
              if (delta) {
                fullAiContent += delta;
                onTokenChunk(delta);
              }
            }
          } catch {}
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!fullAiContent.trim()) {
      throw new Error('Google Gemini không phản hồi nội dung');
    }

    const assistantMsg: AIMessage = {
      id: `msg-ai-${Date.now()}`,
      role: 'assistant',
      content: fullAiContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      routingMeta: { providerId: 'google', model: cleanModel },
    };

    conv.messages.push(assistantMsg);
    conv.updatedAt = new Date().toISOString();

    const allConvs = await this.getConversations();
    storage.set(AI_CONVERSATIONS_KEY, allConvs);
    return { userMsg: conv.messages[conv.messages.length - 2], assistantMsg };
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

    // 1. Ultra-fast Direct Gemini Streaming (sub-second ~300ms, bypassing Vercel cold starts)
    const settings = await this.getSettings();
    const googleConfig = settings.providers.google;
    const rawKeys = googleConfig?.apiKey || '';
    const keyPool = rawKeys
      .split(/[\n,;]+/)
      .map(k => k.trim())
      .filter(k => k.length > 5);

    if (keyPool.length > 0 && attachedFiles.length === 0) {
      try {
        return await this.streamDirectGoogle(
          conv,
          convId,
          userText,
          keyPool,
          googleConfig?.model || 'gemini-3.6-flash',
          settings.temperature,
          settings.maxTokens,
          onTokenChunk,
          onMetadata,
          abortSignal
        );
      } catch (directErr) {
        console.warn('[AI Service] Direct Gemini stream fallback to backend proxy:', directErr);
      }
    }

    // 2. Fallback to Backend Streaming Endpoint
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
