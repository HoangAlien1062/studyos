/**
 * OpenRouter Provider Adapter (OpenAI-compatible unified API)
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

export class OpenRouterAdapter extends AbstractBaseProvider {
  public id: AIProviderId = 'openrouter';
  public name: string = 'OpenRouter';
  public capabilities: ProviderCapabilities = {
    chat: true,
    streaming: true,
    embeddings: false,
    toolCalling: true,
    systemPromptSupport: true,
  };

  private getBaseUrl(): string {
    return this.config.baseUrl?.replace(/\/$/, '') || 'https://openrouter.ai/api/v1';
  }

  async chat(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    const startTime = Date.now();
    const model = options?.model || this.config.model || 'deepseek/deepseek-r1';
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
        'HTTP-Referer': 'https://studyos.edu.vn',
        'X-Title': 'StudyOS Learning Engine',
      },
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
    const model = options?.model || this.config.model || 'deepseek/deepseek-r1';
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
        'HTTP-Referer': 'https://studyos.edu.vn',
        'X-Title': 'StudyOS Learning Engine',
      },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!res.ok) {
      let errBody;
      try { errBody = await res.json(); } catch {}
      throw this.handleError(res.status, res.statusText, errBody);
    }

    if (!res.body) throw new Error(`[${this.name}] Phản hồi stream từ OpenRouter không có body.`);

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
              onChunk({ contentChunk: delta, isFinished: false });
            }
          } catch {}
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

  async generateEmbeddings(): Promise<number[][]> {
    throw new Error('OpenRouter hiện không hỗ trợ endpoint embeddings trực tiếp.');
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const startTime = Date.now();
    try {
      await this.chat(
        [{ role: 'user', content: 'ping' }],
        { maxTokens: 2, temperature: 0 }
      );
      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        latencyMs,
        message: `Kết nối thành công tới OpenRouter (${this.config.model}) - Độ trễ: ${latencyMs}ms`,
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        message: err.message || 'Không thể kết nối tới OpenRouter.',
      };
    }
  }
}
