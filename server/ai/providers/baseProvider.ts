/**
 * Abstract Base Provider for AI Adapters
 */

import {
  AIProviderId,
  BaseAIProvider,
  ChatCompletionOptions,
  ChatCompletionResponse,
  ChatMessage,
  ProviderCapabilities,
  ProviderConfig,
  StreamChunk,
} from '../types';

export abstract class AbstractBaseProvider implements BaseAIProvider {
  public abstract id: AIProviderId;
  public abstract name: string;
  public abstract capabilities: ProviderCapabilities;

  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  public updateConfig(newConfig: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): ProviderConfig {
    return { ...this.config };
  }

  public abstract chat(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResponse>;

  public abstract chatStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<ChatCompletionResponse>;

  public abstract generateEmbeddings(texts: string[]): Promise<number[][]>;

  public abstract testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }>;

  /**
   * Helper to execute fetch with timeout and error classification
   */
  protected async fetchWithTimeout(
    url: string,
    fetchOptions: RequestInit,
    timeoutMs: number = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: fetchOptions.signal || controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Classify HTTP errors to differentiate transient (retryable) vs permanent
   */
  protected handleError(status: number, statusText: string, errorBody: any): Error {
    const message = errorBody?.error?.message || errorBody?.message || statusText || 'Unknown error';

    if (
      status === 401 ||
      status === 403 ||
      (status === 400 && (message.toLowerCase().includes('api key') || message.toLowerCase().includes('apikey')))
    ) {
      const err = new Error(`[${this.name}] Lỗi xác thực hoặc API Key không hợp lệ (Mã ${status}): ${message}`);
      (err as any).isConfigError = true;
      (err as any).statusCode = status;
      return err;
    }

    if (status === 404) {
      const err = new Error(`[${this.name}] Mô hình hoặc endpoint không tồn tại (Mã 404): ${message}`);
      (err as any).isModelNotFoundError = true;
      (err as any).statusCode = status;
      return err;
    }

    if (status === 429) {
      const err = new Error(`[${this.name}] Vượt quá giới hạn lượt gọi (Rate Limit / Quota Exceeded - Mã 429): ${message}`);
      (err as any).isTransient = true;
      (err as any).statusCode = status;
      return err;
    }

    if (status >= 500) {
      const err = new Error(`[${this.name}] Lỗi máy chủ nhà cung cấp (Mã ${status}): ${message}`);
      (err as any).isTransient = true;
      (err as any).statusCode = status;
      return err;
    }

    const err = new Error(`[${this.name}] Lỗi yêu cầu (Mã ${status}): ${message}`);
    (err as any).statusCode = status;
    return err;
  }
}
