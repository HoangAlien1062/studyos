/**
 * OpenAI Provider Adapter (Official REST API)
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

export class OpenAIAdapter extends AbstractBaseProvider {
  public id: AIProviderId = 'openai';
  public name: string = 'OpenAI';
  public capabilities: ProviderCapabilities = {
    chat: true,
    streaming: true,
    embeddings: true,
    toolCalling: true,
    systemPromptSupport: true,
  };

  private getBaseUrl(): string {
    return this.config.baseUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1';
  }

  async chat(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    const startTime = Date.now();
    const model = options?.model || this.config.model || 'gpt-4o';
    const url = `${this.getBaseUrl()}/chat/completions`;

    const body = {
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options?.temperature ?? this.config.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? this.config.maxTokens ?? 2048,
    };

    const res = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!res.ok) {
      let errBody;
      try {
        errBody = await res.json();
      } catch {
        // ignore
      }
      throw this.handleError(res.status, res.statusText, errBody);
    }

    const data = await res.json();
    const latencyMs = Date.now() - startTime;
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content || '',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
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
    const startTime = Date.now();
    const model = options?.model || this.config.model || 'gpt-4o';
    const url = `${this.getBaseUrl()}/chat/completions`;

    const body = {
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options?.temperature ?? this.config.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? this.config.maxTokens ?? 2048,
      stream: true,
    };

    const res = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!res.ok) {
      let errBody;
      try {
        errBody = await res.json();
      } catch {
        // ignore
      }
      throw this.handleError(res.status, res.statusText, errBody);
    }

    if (!res.body) {
      throw new Error(`[${this.name}] Phản hồi stream từ OpenAI không có dữ liệu body.`);
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
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') {
            onChunk({ isFinished: true });
            continue;
          }

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              onChunk({
                contentChunk: delta,
                isFinished: false,
              });
            }
          } catch {
            // ignore partial JSON parse error
          }
        }
      }
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
    const url = `${this.getBaseUrl()}/embeddings`;

    const res = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts,
      }),
    });

    if (!res.ok) {
      let errBody;
      try { errBody = await res.json(); } catch {}
      throw this.handleError(res.status, res.statusText, errBody);
    }

    const data = await res.json();
    return data.data.map((item: any) => item.embedding);
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const startTime = Date.now();
    try {
      // Lightweight call: 1 token test
      const res = await this.chat(
        [{ role: 'user', content: 'ping' }],
        { maxTokens: 2, temperature: 0 }
      );
      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        latencyMs,
        message: `Kết nối thành công tới OpenAI (${this.config.model}) - Độ trễ: ${latencyMs}ms`,
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        message: err.message || 'Không thể kết nối tới OpenAI.',
      };
    }
  }
}
