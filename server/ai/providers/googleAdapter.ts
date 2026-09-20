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

  constructor(config: ProviderConfig) {
    if (config.model === 'gemini-2.0-flash' || config.model === 'gemini-2.0-flash-exp' || config.model?.startsWith('gemini-1.5')) {
      config.model = 'gemini-3.6-flash';
    }
    super(config);
  }

  private normalizeModel(rawModel?: string): string {
    const model = (rawModel || this.config.model || 'gemini-3.6-flash').trim();
    if (
      model === 'gemini-2.0-flash' ||
      model === 'gemini-2.0-flash-exp' ||
      model.startsWith('gemini-1.5') ||
      model === 'gemini-pro'
    ) {
      return 'gemini-3.6-flash';
    }
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
    if (!this.config.apiKey?.trim()) {
      const err = new Error(`[${this.name}] Chưa cấu hình API Key. Vui lòng bấm vào biểu tượng Bánh răng (⚙️ Cài đặt AI) để nhập API Key cho ${this.name}.`);
      (err as any).isConfigError = true;
      (err as any).statusCode = 401;
      throw err;
    }
    const startTime = Date.now();
    const model = this.normalizeModel(options?.model);
    const url = `${this.getBaseUrl()}/models/${model}:generateContent?key=${this.config.apiKey}`;
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

    const res = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!res.ok) {
      let errBody;
      try { errBody = await res.json(); } catch {}
      throw this.handleError(res.status, res.statusText, errBody);
    }

    const data = await res.json();
    const latencyMs = Date.now() - startTime;
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';

    return {
      content: text,
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount,
        completionTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount,
      } : undefined,
      providerId: this.id,
      model,
      latencyMs,
    };
  }

  async chatStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<ChatCompletionResponse> {
    if (!this.config.apiKey?.trim()) {
      const err = new Error(`[${this.name}] Chưa cấu hình API Key. Vui lòng bấm vào biểu tượng Bánh răng (⚙️ Cài đặt AI) để nhập API Key cho ${this.name}.`);
      (err as any).isConfigError = true;
      (err as any).statusCode = 401;
      throw err;
    }
    const startTime = Date.now();
    const model = this.normalizeModel(options?.model);
    const url = `${this.getBaseUrl()}/models/${model}:streamGenerateContent?alt=sse&key=${this.config.apiKey}`;
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

    const res = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!res.ok) {
      let errBody;
      try { errBody = await res.json(); } catch {}
      throw this.handleError(res.status, res.statusText, errBody);
    }

    if (!res.body) throw new Error(`[${this.name}] Phản hồi stream từ Google không có body.`);

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
            const delta = parsed.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('');
            if (delta) {
              fullContent += delta;
              onChunk({ contentChunk: delta, isFinished: false });
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
      return {
        success: true,
        latencyMs,
        message: `Kết nối thành công tới Google Gemini (${model}) - Độ trễ: ${latencyMs}ms`,
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
