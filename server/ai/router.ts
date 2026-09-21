/**
 * AI Router & Automatic Fallback Engine for StudyOS (Part 4)
 */

import { AnthropicAdapter } from './providers/anthropicAdapter';
import { CustomAdapter } from './providers/customAdapter';
import { GoogleAdapter } from './providers/googleAdapter';
import { OpenAIAdapter } from './providers/openaiAdapter';
import { OpenRouterAdapter } from './providers/openrouterAdapter';
import { maskApiKey } from './security';
import {
  AIProviderId,
  BaseAIProvider,
  ChatCompletionOptions,
  ChatCompletionResponse,
  ChatMessage,
  ProviderConfig,
  StreamChunk,
} from './types';

export interface RouterRoutingMeta {
  attemptedProviders: { providerId: AIProviderId; error?: string; latencyMs?: number }[];
  finalProviderId: AIProviderId;
  finalModel: string;
}

export class AIRouter {
  private providers: Map<AIProviderId, BaseAIProvider> = new Map();
  private primaryProviderId: AIProviderId = 'google';
  private fallbackProviderId: AIProviderId = 'openai';

  constructor(initialConfigs: ProviderConfig[] = []) {
    this.initDefaultProviders(initialConfigs);
  }

  private initDefaultProviders(configs: ProviderConfig[]): void {
    const configMap = new Map<AIProviderId, ProviderConfig>();
    for (const c of configs) {
      configMap.set(c.id, c);
    }

    // Default fallback configurations
    const googleCfg = configMap.get('google') || {
      id: 'google',
      name: 'Google Gemini',
      isEnabled: true,
      apiKey: process.env.GOOGLE_API_KEY || '',
      model: 'gemini-3.6-flash',
      priority: 1,
    };
    const openaiCfg = configMap.get('openai') || {
      id: 'openai',
      name: 'OpenAI',
      isEnabled: false,
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4o',
      priority: 2,
    };
    const anthropicCfg = configMap.get('anthropic') || {
      id: 'anthropic',
      name: 'Anthropic Claude',
      isEnabled: false,
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: 'claude-3-5-sonnet-20241022',
      priority: 3,
    };
    const openrouterCfg = configMap.get('openrouter') || {
      id: 'openrouter',
      name: 'OpenRouter',
      isEnabled: false,
      apiKey: process.env.OPENROUTER_API_KEY || '',
      model: 'deepseek/deepseek-r1',
      priority: 4,
    };
    const customCfg = configMap.get('custom') || {
      id: 'custom',
      name: 'Custom Endpoint',
      isEnabled: false,
      apiKey: '',
      model: 'llama3',
      baseUrl: 'http://localhost:11434/v1',
      priority: 5,
    };

    this.registerProvider(new GoogleAdapter(googleCfg));
    this.registerProvider(new OpenAIAdapter(openaiCfg));
    this.registerProvider(new AnthropicAdapter(anthropicCfg));
    this.registerProvider(new OpenRouterAdapter(openrouterCfg));
    this.registerProvider(new CustomAdapter(customCfg));
  }

  public registerProvider(provider: BaseAIProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: AIProviderId): BaseAIProvider | undefined {
    return this.providers.get(id);
  }

  public updateProviderConfig(id: AIProviderId, partial: Partial<ProviderConfig>): void {
    const p = this.providers.get(id) as any;
    if (p && typeof p.updateConfig === 'function') {
      p.updateConfig(partial);
    }
  }

  public setRoutingPreference(primary: AIProviderId, fallback: AIProviderId): void {
    this.primaryProviderId = primary;
    this.fallbackProviderId = fallback;
  }

  /**
   * Get sorted candidates list for auto-routing or fallback
   */
  public getCandidateProviders(preferred?: AIProviderId): BaseAIProvider[] {
    const all = Array.from(this.providers.values()).filter(p => {
      const cfg = (p as any).getConfig ? (p as any).getConfig() : {};
      return cfg.isEnabled;
    });

    if (preferred && preferred !== 'auto') {
      const target = this.providers.get(preferred);
      if (target) {
        const others = all.filter(p => p.id !== preferred);
        return [target, ...others];
      }
    }

    // Auto order: Primary -> Fallback -> Other enabled
    const ordered: BaseAIProvider[] = [];
    const primary = this.providers.get(this.primaryProviderId);
    if (primary && (primary as any).getConfig().isEnabled) {
      ordered.push(primary);
    }

    const fallback = this.providers.get(this.fallbackProviderId);
    if (fallback && fallback.id !== this.primaryProviderId && (fallback as any).getConfig().isEnabled) {
      ordered.push(fallback);
    }

    for (const p of all) {
      if (!ordered.find(o => o.id === p.id)) {
        ordered.push(p);
      }
    }

    return ordered;
  }

  /**
   * Execute chat completion with Automatic Fallback
   */
  public async chat(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
    preferredProvider?: AIProviderId
  ): Promise<ChatCompletionResponse & { routingMeta: RouterRoutingMeta }> {
    const candidates = this.getCandidateProviders(preferredProvider);
    if (candidates.length === 0) {
      throw new Error(
        'Không có nhà cung cấp AI nào đang được kích hoạt. Vui lòng vào Cài đặt -> AI Settings để bật ít nhất một nhà cung cấp và nhập API Key.'
      );
    }

    const meta: RouterRoutingMeta = {
      attemptedProviders: [],
      finalProviderId: candidates[0].id,
      finalModel: '',
    };

    let lastError: Error | null = null;

    for (let i = 0; i < candidates.length; i++) {
      const provider = candidates[i];
      const start = Date.now();

      try {
        const response = await provider.chat(messages, options);
        meta.attemptedProviders.push({
          providerId: provider.id,
          latencyMs: Date.now() - start,
        });
        meta.finalProviderId = response.providerId;
        meta.finalModel = response.model;

        return {
          ...response,
          routingMeta: meta,
        };
      } catch (err: any) {
        const latencyMs = Date.now() - start;
        meta.attemptedProviders.push({
          providerId: provider.id,
          error: err.message,
          latencyMs,
        });

        lastError = err;

        // Permanent config error (e.g. 401 Invalid Key) -> Do NOT silently continue if explicitly selected!
        if (err.isConfigError && preferredProvider && preferredProvider !== 'auto') {
          throw err;
        }

        // If this is the last candidate, rethrow
        if (i === candidates.length - 1) {
          break;
        }

        console.warn(`[AI Router] Provider ${provider.name} gặp lỗi (${err.message}). Tự động fallback sang provider tiếp theo...`);
      }
    }

    throw lastError || new Error('Tất cả các nhà cung cấp AI đều không phản hồi.');
  }

  /**
   * Execute streaming chat completion with Seamless Fallback
   */
  public async chatStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions,
    onChunk: (chunk: StreamChunk) => void,
    preferredProvider?: AIProviderId
  ): Promise<ChatCompletionResponse & { routingMeta: RouterRoutingMeta }> {
    const candidates = this.getCandidateProviders(preferredProvider);
    if (candidates.length === 0) {
      throw new Error('Chưa có nhà cung cấp AI nào được kích hoạt.');
    }

    const meta: RouterRoutingMeta = {
      attemptedProviders: [],
      finalProviderId: candidates[0].id,
      finalModel: '',
    };

    let lastError: Error | null = null;

    for (let i = 0; i < candidates.length; i++) {
      const provider = candidates[i];
      const start = Date.now();
      let hasEmittedFirstChunk = false;

      try {
        const response = await provider.chatStream(
          messages,
          options,
          chunk => {
            hasEmittedFirstChunk = true;
            onChunk(chunk);
          }
        );

        meta.attemptedProviders.push({
          providerId: provider.id,
          latencyMs: Date.now() - start,
        });
        meta.finalProviderId = response.providerId;
        meta.finalModel = response.model;

        return {
          ...response,
          routingMeta: meta,
        };
      } catch (err: any) {
        meta.attemptedProviders.push({
          providerId: provider.id,
          error: err.message,
          latencyMs: Date.now() - start,
        });

        lastError = err;

        // If chunks were already partially sent to user, we cannot seamlessly switch mid-stream
        if (hasEmittedFirstChunk) {
          onChunk({
            contentChunk: `\n\n*(Lỗi gián đoạn stream: ${err.message})*`,
            isFinished: true,
          });
          throw err;
        }

        if (err.isConfigError && preferredProvider && preferredProvider !== 'auto') {
          throw err;
        }

        if (i === candidates.length - 1) break;

        console.warn(`[AI Router Stream] Provider ${provider.name} lỗi trước khi sinh chunk. Fallback sang ${candidates[i + 1].name}...`);
      }
    }

    throw lastError || new Error('Không thể sinh câu trả lời từ các nhà cung cấp AI.');
  }

  /**
   * Return safe provider summaries with MASKED API keys for frontend
   */
  public getProvidersSummary(): (Omit<ProviderConfig, 'apiKey'> & { maskedApiKey: string; isConfigured: boolean })[] {
    return Array.from(this.providers.values()).map(p => {
      const cfg = (p as any).getConfig ? (p as any).getConfig() : ({} as ProviderConfig);
      return {
        id: cfg.id,
        name: cfg.name,
        isEnabled: Boolean(cfg.isEnabled),
        model: cfg.model,
        baseUrl: cfg.baseUrl,
        temperature: cfg.temperature,
        maxTokens: cfg.maxTokens,
        priority: cfg.priority,
        status: cfg.status || 'disconnected',
        lastPingMs: cfg.lastPingMs,
        lastError: cfg.lastError,
        maskedApiKey: maskApiKey(cfg.apiKey || ''),
        isConfigured: Boolean(cfg.apiKey && cfg.apiKey.trim().length > 0),
      };
    });
  }

  public async testProvider(id: AIProviderId): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const p = this.providers.get(id);
    if (!p) {
      return { success: false, latencyMs: 0, message: `Không tìm thấy nhà cung cấp: ${id}` };
    }
    return p.testConnection();
  }
}

export const aiRouter = new AIRouter();
