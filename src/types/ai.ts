export type AIProvider = 'auto' | 'openai' | 'anthropic' | 'google' | 'openrouter' | 'custom';

export type AIMode =
  | 'general'
  | 'study'
  | 'document'
  | 'question'
  | 'flashcard'
  | 'quiz'
  | 'summarize';

export interface AttachedStudyFile {
  id: string;
  name: string;
  type: string;
  size: number;
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

export interface MessageRoutingMeta {
  providerId: AIProvider;
  model: string;
  latencyMs?: number;
  fallbackOccurred?: boolean;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachedFiles?: AttachedStudyFile[];
  citations?: SourceCitation[];
  routingMeta?: MessageRoutingMeta;
  feedback?: 'like' | 'dislike' | null;
}

export interface AIConversation {
  id: string;
  title: string;
  mode: AIMode;
  createdAt: string;
  updatedAt: string;
  messages: AIMessage[];
}

export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  isEnabled: boolean;
  apiKey: string;
  maskedApiKey?: string;
  isConfigured?: boolean;
  model: string;
  baseUrl?: string;
  status: 'connected' | 'disconnected' | 'testing' | 'error';
  lastPingMs?: number;
  lastError?: string;
  priority?: number;
}

export interface AISettingsState {
  primaryProvider: AIProvider;
  fallbackProvider: AIProvider;
  temperature: number; // 0.0 to 1.0
  maxTokens: number;
  streamingEnabled?: boolean;
  ragEnabled?: boolean;
  ragSimilarityThreshold?: number; // 0.0 to 1.0
  ragTopK?: number;
  providers: Record<AIProvider, AIProviderConfig>;
}
