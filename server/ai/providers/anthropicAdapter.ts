/**
 * Anthropic Claude Provider Adapter (Official Messages API)
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

export class AnthropicAdapter extends AbstractBaseProvider {
  public id: AIProviderId = 'anthropic';
  public name: string = 'Anthropic Claude';
  public capabilities: ProviderCapabilities = {
    chat: true,
    streaming: true,
    embeddings: false,
    toolCalling: true,
    systemPromptSupport: true,
  };

  private getBaseUrl(): string {
    return this.config.baseUrl?.replace(/\/$/, '') || 'https://api.anthropic.com/v1';
  }

  private prepareMessages(messages: ChatMessage[]) {
    let systemPrompt = '';
    const nonSystemMessages: { role: 'user' | 'assistant'; content: string }[] = [];

    for (const m of messages) {
      if (m.role === 'system') {
        systemPrompt += (systemPrompt ? '\n\n' : '') + m.content;
      } else {
        nonSystemMessages.push({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        });
      }
    }

    if (nonSystemMessages.length === 0) {
      nonSystemMessages.push({ role: 'user', content: 'Xin chào' });
    }

    return { systemPrompt, nonSystemMessages };
  }

  async chat(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    const startTime = Date.now();
    const model = options?.model || this.config.model || 'claude-3-5-sonnet-20241022';
    const url = `${this.getBaseUrl()}/messages`;
    const { systemPrompt, nonSystemMessages } = this.prepareMessages(messages);

    const body: any = {
      model,
      messages: nonSystemMessages,
      max_tokens: options?.maxTokens ?? this.config.maxTokens ?? 2048,
      temperature: options?.temperature ?? this.config.temperature ?? 0.7,
    };
    if (systemPrompt) body.system = systemPrompt;

    const res = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
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
    const textBlock = data.content?.find((c: any) => c.type === 'text');

    return {
      content: textBlock?.text || '',
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
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
    const model = options?.model || this.config.model || 'claude-3-5-sonnet-20241022';
    const url = `${this.getBaseUrl()}/messages`;
    const { systemPrompt, nonSystemMessages } = this.prepareMessages(messages);

    const body: any = {
      model,
      messages: nonSystemMessages,
      max_tokens: options?.maxTokens ?? this.config.maxTokens ?? 2048,
      temperature: options?.temperature ?? this.config.temperature ?? 0.7,
      stream: true,
    };
    if (systemPrompt) body.system = systemPrompt;

    const res = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!res.ok) {
      let errBody;
      try { errBody = await res.json(); } catch {}
      throw this.handleError(res.status, res.statusText, errBody);
    }

    if (!res.body) throw new Error(`[${this.name}] Phản hồi stream từ Anthropic không có body.`);

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
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              const text = parsed.delta.text;
              fullContent += text;
              onChunk({ contentChunk: text, isFinished: false });
            } else if (parsed.type === 'message_stop') {
              onChunk({ isFinished: true });
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
    throw new Error('Anthropic Claude hiện chưa cung cấp endpoint embeddings độc lập.');
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
        message: `Kết nối thành công tới Anthropic (${this.config.model}) - Độ trễ: ${latencyMs}ms`,
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        message: err.message || 'Không thể kết nối tới Anthropic.',
      };
    }
  }
}
