/**
 * Types and Contracts for StudyOS AI Engine (Part 4)
 */

export type AIProviderId = 'openai' | 'anthropic' | 'google' | 'openrouter' | 'custom' | 'auto';

export type AIMode =
  | 'general'
  | 'study'
  | 'document'
  | 'question'
  | 'flashcard'
  | 'quiz'
  | 'summarize';

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  id?: string;
  role: MessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
  citations?: SourceCitation[];
  timestamp?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: { type: string };
    }>;
    required?: string[];
  };
}

export interface SourceCitation {
  documentId: string;
  documentName: string;
  page?: number;
  section?: string;
  chunkIndex: number;
  snippet: string;
  similarity: number;
}

export interface ProviderConfig {
  id: AIProviderId;
  name: string;
  isEnabled: boolean;
  apiKey: string; // Plaintext on server, encrypted in DB, masked when sent to client
  model: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  priority?: number; // 1 = primary, 2 = secondary, etc.
  status?: 'connected' | 'disconnected' | 'testing' | 'error';
  lastPingMs?: number;
  lastError?: string;
}

export interface ProviderCapabilities {
  chat: boolean;
  streaming: boolean;
  embeddings: boolean;
  toolCalling: boolean;
  systemPromptSupport: boolean;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  stream?: boolean;
  signal?: AbortSignal;
}

export interface ChatCompletionResponse {
  content: string;
  toolCalls?: ToolCall[];
  citations?: SourceCitation[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  providerId: AIProviderId;
  model: string;
  latencyMs: number;
}

export interface StreamChunk {
  contentChunk?: string;
  toolCallChunk?: Partial<ToolCall>;
  isFinished: boolean;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface BaseAIProvider {
  id: AIProviderId;
  name: string;
  capabilities: ProviderCapabilities;

  chat(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResponse>;

  chatStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<ChatCompletionResponse>;

  generateEmbeddings(texts: string[]): Promise<number[][]>;

  testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }>;
}

export interface RAGDocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  userId: string;
  chunkIndex: number;
  content: string;
  pageNumber?: number;
  sectionTitle?: string;
  embedding?: number[];
  tokenEstimate: number;
  createdAt: string;
}

export interface RAGQueryResult {
  chunks: (RAGDocumentChunk & { similarity: number })[];
  augmentedContext: string;
  citations: SourceCitation[];
}
