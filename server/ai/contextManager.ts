/**
 * Context Manager & Token Budgeting Engine for StudyOS (Part 4)
 */

import { BASE_SYSTEM_PROMPT, getModeInstruction } from './prompts';
import { AIMode, ChatMessage, MessageRole, SourceCitation } from './types';

export interface ContextBuildOptions {
  mode: AIMode;
  ragContext?: string;
  toolContext?: string;
  citations?: SourceCitation[];
  maxContextTokens?: number;
}

export class ContextManager {
  private defaultMaxTokens = 4096;

  /**
   * Simple and fast character-to-token approximation (Vietnamese & English: ~3.5 chars / token)
   */
  public estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 3.5);
  }

  /**
   * Build complete message history within token budget
   */
  public buildContext(
    conversationMessages: { role: MessageRole; content: string }[],
    options: ContextBuildOptions
  ): ChatMessage[] {
    const maxTokens = options.maxContextTokens || this.defaultMaxTokens;
    const modeInstruction = getModeInstruction(options.mode);

    // 1. Build immutable system instruction
    let fullSystemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${modeInstruction}`;

    if (options.ragContext) {
      fullSystemPrompt += `\n\n[DỮ LIỆU TÀI LIỆU TRÍCH XUẤT - RAG CONTEXT]:\n${options.ragContext}`;
    }

    if (options.toolContext) {
      fullSystemPrompt += `\n\n[DỮ LIỆU HỌC TẬP TỪ HỆ THỐNG - SYSTEM TOOL CONTEXT]:\n${options.toolContext}`;
    }

    const systemTokens = this.estimateTokens(fullSystemPrompt);
    let remainingBudget = maxTokens - systemTokens;

    if (remainingBudget < 500) {
      // If RAG/System context is very large, truncate RAG context to preserve history
      remainingBudget = 500;
    }

    // 2. Select recent conversation turns in reverse order
    const selectedHistory: ChatMessage[] = [];
    const reversed = [...conversationMessages].reverse();

    for (const msg of reversed) {
      if (msg.role === 'system') continue; // Handled above

      const msgTokens = this.estimateTokens(msg.content);
      if (msgTokens > remainingBudget && selectedHistory.length > 0) {
        break; // Out of budget, stop including older messages
      }

      selectedHistory.unshift({
        role: msg.role,
        content: msg.content,
      });

      remainingBudget -= msgTokens;
    }

    // 3. Assemble final message list
    return [
      {
        role: 'system',
        content: fullSystemPrompt,
        citations: options.citations,
      },
      ...selectedHistory,
    ];
  }
}

export const contextManager = new ContextManager();
