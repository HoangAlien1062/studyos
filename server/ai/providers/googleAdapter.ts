/**
 * Google Gemini Provider Adapter (Official v1beta REST API)
 */

import {
  AIProviderId,
  ChatCompletionOptions,
  ChatCompletionResponse,
  ChatMessage,
  ProviderCapabilities,
  ProviderConfig,
  StreamChunk,
} from '../types';
import { AbstractBaseProvider } from './baseProvider';

export class GoogleAdapter extends AbstractBaseProvider {
  public id: AIProviderId = 'google';
  public name: string = 'Google Gemini';
  public capabilities: ProviderCapabilities = {
    chat: true,
    streaming: true,
    embeddings: true,
    toolCalling: true,
    systemPromptSupport: true,
  };

  private currentKeyIndex = 0;

  constructor(config: ProviderConfig) {
    super(config);
  }

  public getKeyPool(): string[] {
    const raw = this.config.apiKey || '';
    const parts = raw
      .split(/[\n,;]+/)
      .map(k => k.trim())
      .filter(k => k.length > 5);
    return parts.length > 0 ? parts : (raw.trim() ? [raw.trim()] : []);
  }

  private getNextApiKey(): string {
    const pool = this.getKeyPool();
    if (pool.length === 0) return '';
    const key = pool[this.currentKeyIndex % pool.length];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % pool.length;
    return key;
  }

  private normalizeModel(rawModel?: string): string {
    const model = (rawModel || this.config.model || 'gemini-3.6-flash').trim();
    return model;
  }

  private getBaseUrl(): string {
    return this.config.baseUrl?.replace(/\/$/, '') || 'https://generativelanguage.googleapis.com/v1beta';
  }

  private prepareContents(messages: ChatMessage[]) {
    let systemInstruction = '';
    const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

    for (const m of messages) {
      if (m.role === 'system') {
        systemInstruction += (systemInstruction ? '\n\n' : '') + m.content;
      } else {
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        });
      }
    }

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Xin chào' }] });
    }

    return { systemInstruction, contents };
  }

  async chat(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    const pool = this.getKeyPool();
    if (pool.length === 0) {
      const err = new Error(`[${this.name}] Chưa cấu hình API Key. Vui lòng bấm vào biểu tượng Bánh răng (⚙️ Cài đặt AI) để nhập API Key cho ${this.name}.`);
      (err as any).isConfigError = true;
      (err as any).statusCode = 401;
      throw err;
    }

    const model = this.normalizeModel(options?.model);
    const { systemInstruction, contents } = this.prepareContents(messages);

    const body: any = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? this.config.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? this.config.maxTokens ?? 2048,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    let lastError: any = null;
    const maxAttempts = Math.min(pool.length, 3);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const activeKey = this.getNextApiKey();
      const startTime = Date.now();
      const url = `${this.getBaseUrl()}/models/${model}:generateContent?key=${activeKey}`;

      try {
        const res = await this.fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: options?.signal,
        });

        if (!res.ok) {
          let errBody;
          try { errBody = await res.json(); } catch {}
          const errorObj = this.handleError(res.status, res.statusText, errBody);

          // Auto-rotate on rate limit (429) or quota exceeded (403)
          if ((res.status === 429 || res.status === 403) && attempt < maxAttempts - 1) {
            console.warn(`[Google Gemini] Key ...${activeKey.slice(-6)} bị giới hạn tần suất (${res.status}). Tự động đổi sang key tiếp theo trong pool...`);
            continue;
          }
          throw errorObj;
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts
          ?.filter((p: any) => !p.thought)
          ?.map((p: any) => p.text)
          ?.join('') || '';

        const latencyMs = Date.now() - startTime;
        return {
          content: text,
          usage: data.usageMetadata ? {
            promptTokens: data.usageMetadata.promptTokenCount || 0,
            completionTokens: data.usageMetadata.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata.totalTokenCount || 0,
          } : undefined,
          providerId: this.id,
          model,
          latencyMs,
        };
      } catch (err: any) {
        lastError = err;
        if (attempt < maxAttempts - 1 && (err.status === 429 || err.statusCode === 429 || err.message?.includes('429'))) {
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  }

  async chatStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<ChatCompletionResponse> {
    const pool = this.getKeyPool();
    if (pool.length === 0) {
      const err = new Error(`[${this.name}] Chưa cấu hình API Key. Vui lòng bấm vào biểu tượng Bánh răng (⚙️ Cài đặt AI) để nhập API Key cho ${this.name}.`);
      (err as any).isConfigError = true;
      (err as any).statusCode = 401;
      throw err;
    }

    const startTime = Date.now();
    const model = this.normalizeModel(options?.model);
    const { systemInstruction, contents } = this.prepareContents(messages);

    const body: any = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? this.config.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? this.config.maxTokens ?? 2048,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    let res: Response | null = null;
    let activeKey = '';
    const maxAttempts = Math.min(pool.length, 3);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      activeKey = this.getNextApiKey();
      const url = `${this.getBaseUrl()}/models/${model}:streamGenerateContent?alt=sse&key=${activeKey}`;

      try {
        const attemptRes = await this.fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: options?.signal,
        });

        if (!attemptRes.ok) {
          let errBody;
          try { errBody = await attemptRes.json(); } catch {}
          if ((attemptRes.status === 429 || attemptRes.status === 403) && attempt < maxAttempts - 1) {
            console.warn(`[Google Gemini Stream] Key ...${activeKey.slice(-6)} bị giới hạn tần suất (${attemptRes.status}). Tự động đổi key...`);
            continue;
          }
          throw this.handleError(attemptRes.status, attemptRes.statusText, errBody);
        }

        res = attemptRes;
        break;
      } catch (err: any) {
        if (attempt < maxAttempts - 1 && (err.status === 429 || err.statusCode === 429 || err.message?.includes('429'))) {
          continue;
        }
        throw err;
      }
    }

    if (!res || !res.body) {
      throw new Error(`[${this.name}] Phản hồi stream từ Google không có body.`);
    }

    let fullContent = '';
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
              if (fullContent.length > 0 && delta.startsWith(fullContent)) {
                delta = delta.slice(fullContent.length);
              }

              if (delta) {
                fullContent += delta;
                onChunk({ contentChunk: delta, isFinished: false });
              }
            }
          } catch {}
        }
      }
      onChunk({ isFinished: true });
    } finally {
      reader.releaseLock();
    }

    const latencyMs = Date.now() - startTime;
    return {
      content: fullContent,
      providerId: this.id,
      model,
      latencyMs,
    };
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    const model = 'text-embedding-004';
    const url = `${this.getBaseUrl()}/models/${model}:batchEmbedContents?key=${this.config.apiKey}`;

    const requests = texts.map(t => ({
      model: `models/${model}`,
      content: { parts: [{ text: t }] },
    }));

    const res = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });

    if (!res.ok) {
      let errBody;
      try { errBody = await res.json(); } catch {}
      throw this.handleError(res.status, res.statusText, errBody);
    }

    const data = await res.json();
    return data.embeddings.map((item: any) => item.values);
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const startTime = Date.now();
    try {
      const model = this.normalizeModel(this.config.model);
      await this.chat(
        [{ role: 'user', content: 'ping' }],
        { maxTokens: 2, temperature: 0, model }
      );
      const latencyMs = Date.now() - startTime;
      const pool = this.getKeyPool();
      return {
        success: true,
        latencyMs,
        message: `Kết nối thành công tới Google Gemini (${model}) - Độ trễ: ${latencyMs}ms (${pool.length} API Key${pool.length > 1 ? 's' : ''} sẵn sàng)`,
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        message: err.message || 'Không thể kết nối tới Google Gemini.',
      };
    }
  }
}
