/**
 * Master API Controller & Request Dispatcher for StudyOS AI Engine (Part 4)
 * Handles all /api/ai/* endpoints with Streaming SSE, Security, RAG, and Routing.
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import { contextManager } from './contextManager';
import { ragEngine } from './rag/ragEngine';
import { vectorStore } from './rag/vectorStore';
import { aiRouter } from './router';
import { encryptSecret, validateCustomBaseUrl } from './security';
import { systemToolsExecutor } from './tools/systemTools';
import { AIMode, AIProviderId, ChatMessage, SourceCitation, StreamChunk } from './types';

// Helper to parse JSON body from incoming Node HTTP request
async function parseJsonBody<T = any>(req: IncomingMessage): Promise<T> {
  if ((req as any).body) {
    if (typeof (req as any).body === 'object') return (req as any).body as T;
    if (typeof (req as any).body === 'string') {
      try {
        return JSON.parse((req as any).body) as T;
      } catch {
        return {} as T;
      }
    }
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      // 10MB payload limit
      if (raw.length > 10 * 1024 * 1024) {
        reject(new Error('Kích thước payload vượt quá 10MB.'));
      }
    });
    req.on('end', () => {
      try {
        const parsed = raw ? JSON.parse(raw) : {};
        resolve(parsed as T);
      } catch (err) {
        reject(new Error('Dữ liệu JSON không hợp lệ.'));
      }
    });
    req.on('error', reject);
  });
}

// Helper to send JSON responses
function sendJson(res: ServerResponse, statusCode: number, data: any): void {
  const jsonStr = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(jsonStr),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(jsonStr);
}

/**
 * Handle incoming /api/ai requests
 */
export async function handleAIRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url || '';
  if (!url.startsWith('/api/ai') && !url.startsWith('/api/health') && url !== '/health') {
    return false; // Not handled by AI engine
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return true;
  }

  const pathname = url.split('?')[0];

  try {
    // 0. GET /api/health or /health - Health check endpoint
    if (req.method === 'GET' && (pathname === '/api/health' || pathname === '/health')) {
      const mem = process.memoryUsage();
      const providers = aiRouter.getProvidersSummary();
      const activeProvider = providers.find(p => p.isEnabled && p.isConfigured)?.id || 'none';
      const availableProviders = providers.filter(p => p.isEnabled).map(p => p.id);

      sendJson(res, 200, {
        status: 'healthy',
        uptime: Math.round(process.uptime() * 100) / 100,
        memory: {
          heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
        },
        timestamp: new Date().toISOString(),
        services: {
          server: 'online',
          aiRouter: {
            activeProvider,
            availableProviders,
            totalConfigured: providers.filter(p => p.isConfigured).length,
          },
          vectorStore: {
            status: 'ready',
            totalChunks: vectorStore.getAllChunks().length,
          },
          database: (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) ? 'configured' : 'offline_local',
        },
      });
      return true;
    }

    // 1. GET /api/ai/providers - List providers with masked keys
    if (req.method === 'GET' && pathname === '/api/ai/providers') {
      const summary = aiRouter.getProvidersSummary();
      sendJson(res, 200, { success: true, providers: summary });
      return true;
    }

    // 2. POST /api/ai/providers - Update provider configuration
    if (req.method === 'POST' && pathname === '/api/ai/providers') {
      const body = await parseJsonBody(req);
      const { providerId, apiKey, model, baseUrl, isEnabled, temperature, maxTokens, priority } = body;

      if (!providerId) {
        sendJson(res, 400, { success: false, error: 'Thiếu providerId.' });
        return true;
      }

      // Check SSRF if baseUrl provided for custom provider
      if (providerId === 'custom' && baseUrl) {
        const ssrfCheck = validateCustomBaseUrl(baseUrl);
        if (!ssrfCheck.isValid) {
          sendJson(res, 400, { success: false, error: ssrfCheck.error });
          return true;
        }
      }

      const updates: any = {};
      if (apiKey && !apiKey.includes('...')) {
        // Plaintext key provided, store securely
        updates.apiKey = apiKey.trim();
        updates.encryptedApiKey = encryptSecret(apiKey.trim());
      }
      if (model !== undefined) updates.model = model;
      if (baseUrl !== undefined) updates.baseUrl = baseUrl;
      if (isEnabled !== undefined) updates.isEnabled = Boolean(isEnabled);
      if (temperature !== undefined) updates.temperature = Number(temperature);
      if (maxTokens !== undefined) updates.maxTokens = Number(maxTokens);
      if (priority !== undefined) updates.priority = Number(priority);

      aiRouter.updateProviderConfig(providerId, updates);
      sendJson(res, 200, {
        success: true,
        message: `Đã cập nhật cấu hình cho ${providerId}.`,
        providers: aiRouter.getProvidersSummary(),
      });
      return true;
    }

    // 3. POST /api/ai/test-connection - Test provider connection with ping
    if (req.method === 'POST' && pathname === '/api/ai/test-connection') {
      const body = await parseJsonBody(req);
      const { providerId } = body;
      if (!providerId) {
        sendJson(res, 400, { success: false, error: 'Thiếu providerId.' });
        return true;
      }

      const result = await aiRouter.testProvider(providerId);
      sendJson(res, 200, result);
      return true;
    }

    // 4. POST /api/ai/chat - Streaming & Non-streaming Chat Completion with RAG & Tools
    if (req.method === 'POST' && pathname === '/api/ai/chat') {
      const body = await parseJsonBody(req);
      const {
        messages = [],
        mode = 'general',
        preferredProvider,
        providerApiKey,
        providerModel,
        attachedDocumentIds = [],
        temperature,
        maxTokens,
        stream = true,
        userContext,
      } = body;

      // Dynamically sync provider key and model if passed from client
      if (preferredProvider && preferredProvider !== 'auto' && (providerApiKey || providerModel)) {
        const updates: any = {};
        if (providerApiKey && typeof providerApiKey === 'string' && !providerApiKey.includes('...') && providerApiKey.trim()) {
          updates.apiKey = providerApiKey.trim();
          updates.isEnabled = true;
        }
        if (providerModel && typeof providerModel === 'string' && providerModel.trim()) {
          updates.model = providerModel.trim();
        }
        aiRouter.updateProviderConfig(preferredProvider as AIProviderId, updates);
      }

      if (!Array.isArray(messages) || messages.length === 0) {
        sendJson(res, 400, { success: false, error: 'Danh sách tin nhắn không được để trống.' });
        return true;
      }

      const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
      const queryText = lastUserMsg?.content || '';

      // --- RAG RETRIEVAL PIPELINE ---
      let ragContext = '';
      let citations: SourceCitation[] = [];

      if (attachedDocumentIds && attachedDocumentIds.length > 0) {
        const ragResult = await ragEngine.query(queryText, {
          userId: userContext?.userId || undefined,
          documentIds: attachedDocumentIds,
          topK: 4,
          minSimilarity: 0.45,
        });
        ragContext = ragResult.augmentedContext;
        citations = ragResult.citations;
      }

      // --- ASSEMBLE CONTEXT & TOKEN BUDGET ---
      const assembledMessages = contextManager.buildContext(messages, {
        mode: mode as AIMode,
        ragContext,
        citations,
      });

      // --- STREAMING SSE MODE ---
      if (stream) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });

        // Send initial metadata event with citations
        res.write(`data: ${JSON.stringify({ type: 'meta', citations })}\n\n`);

        try {
          const result = await aiRouter.chatStream(
            assembledMessages,
            { temperature, maxTokens },
            (chunk: StreamChunk) => {
              if (chunk.contentChunk) {
                res.write(`data: ${JSON.stringify({ type: 'chunk', delta: chunk.contentChunk })}\n\n`);
              }
              if (chunk.isFinished) {
                res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
              }
            },
            preferredProvider as AIProviderId
          );

          res.write(
            `data: ${JSON.stringify({
              type: 'final',
              providerId: result.providerId,
              model: result.model,
              latencyMs: result.latencyMs,
              routingMeta: result.routingMeta,
            })}\n\n`
          );
        } catch (err: any) {
          res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
        } finally {
          res.write('data: [DONE]\n\n');
          res.end();
        }
        return true;
      }

      // --- NON-STREAMING MODE ---
      const response = await aiRouter.chat(
        assembledMessages,
        { temperature, maxTokens },
        preferredProvider as AIProviderId
      );

      sendJson(res, 200, {
        success: true,
        content: response.content,
        citations,
        providerId: response.providerId,
        model: response.model,
        latencyMs: response.latencyMs,
        routingMeta: response.routingMeta,
      });
      return true;
    }

    // 5. POST /api/ai/rag/process-document - Ingest, Chunk & Index Document
    if (req.method === 'POST' && pathname === '/api/ai/rag/process-document') {
      const body = await parseJsonBody(req);
      const { documentId, documentName, fileType, fileBase64, userId = 'default-user' } = body;

      if (!documentId || !documentName || !fileBase64) {
        sendJson(res, 400, { success: false, error: 'Thiếu thông tin documentId, documentName hoặc fileBase64.' });
        return true;
      }

      const fileBuffer = Buffer.from(fileBase64, 'base64');
      const result = await ragEngine.indexDocument({
        fileBuffer,
        documentId,
        documentName,
        fileType: fileType || documentName.split('.').pop() || 'txt',
        userId,
      });

      sendJson(res, 200, {
        success: true,
        message: `Đã xử lý và lập chỉ mục RAG thành công (${result.chunkCount} đoạn trích, ${result.wordCount} từ).`,
        ...result,
      });
      return true;
    }

    // 6. POST /api/ai/rag/query - Query RAG Chunks directly
    if (req.method === 'POST' && pathname === '/api/ai/rag/query') {
      const body = await parseJsonBody(req);
      const { query, documentIds, userId, topK = 4 } = body;

      const result = await ragEngine.query(query, {
        documentIds,
        userId,
        topK,
      });

      sendJson(res, 200, { success: true, ...result });
      return true;
    }

    // 7. POST /api/ai/tools/execute - Execute Read-Only System Data Tools
    if (req.method === 'POST' && pathname === '/api/ai/tools/execute') {
      const body = await parseJsonBody(req);
      const { toolName, args = {}, userContext = {} } = body;

      if (!toolName) {
        sendJson(res, 400, { success: false, error: 'Thiếu toolName.' });
        return true;
      }

      const result = await systemToolsExecutor.executeTool(toolName, args, userContext);
      sendJson(res, 200, { success: true, result });
      return true;
    }

    // 8. POST /api/ai/generate - Structured Generation for Preview Modal (Flashcards, Questions, Notes)
    if (req.method === 'POST' && pathname === '/api/ai/generate') {
      const body = await parseJsonBody(req);
      const { targetType, prompt, count = 5, subjectName, difficulty = 'medium' } = body;

      let instruction = '';
      if (targetType === 'flashcards') {
        instruction = `Hãy tạo chính xác ${count} thẻ Flashcard về chủ đề hoặc tài liệu sau. Định dạng bắt buộc trả về là một mảng JSON thuần túy (không bọc text giải thích bên ngoài):
[
  {
    "front": "Câu hỏi hoặc khái niệm cốt lõi",
    "back": "Định nghĩa, công thức hoặc câu trả lời súc tích",
    "hint": "Gợi ý ngắn (tùy chọn)",
    "difficulty": "${difficulty}"
  }
]`;
      } else if (targetType === 'questions') {
        instruction = `Hãy tạo chính xác ${count} câu hỏi trắc nghiệm môn ${subjectName || 'học'} độ khó ${difficulty}. Định dạng bắt buộc trả về là một mảng JSON thuần túy (không bọc text giải thích bên ngoài):
[
  {
    "content": "Nội dung câu hỏi...",
    "options": [
      { "id": "opt-1", "text": "Phương án A" },
      { "id": "opt-2", "text": "Phương án B" },
      { "id": "opt-3", "text": "Phương án C" },
      { "id": "opt-4", "text": "Phương án D" }
    ],
    "correctOptionId": "opt-1",
    "explanation": "Giải thích chi tiết vì sao phương án này đúng..."
  }
]`;
      } else if (targetType === 'notes') {
        instruction = `Hãy tạo một bản ghi chú học tập Markdown có cấu trúc rõ ràng, công thức KaTeX ($...$ và $$...$$) và code block nếu có. Định dạng trả về JSON:
{
  "title": "Tiêu đề ghi chú",
  "contentMarkdown": "Nội dung chi tiết...",
  "tags": ["Chủ đề 1", "Chủ đề 2"]
}`;
      } else {
        sendJson(res, 400, { success: false, error: 'targetType không hợp lệ (flashcards, questions, notes).' });
        return true;
      }

      const response = await aiRouter.chat([
        { role: 'system', content: 'Bạn là chuyên gia thiết kế tài liệu học tập chuẩn mực.' },
        { role: 'user', content: `${instruction}\n\nNội dung cần tạo:\n${prompt}` },
      ]);

      // Parse JSON from code fence or raw string
      let jsonText = response.content.trim();
      const codeFenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeFenceMatch) {
        jsonText = codeFenceMatch[1];
      }

      let parsedData: any;
      try {
        parsedData = JSON.parse(jsonText);
      } catch {
        parsedData = { rawText: response.content };
      }

      sendJson(res, 200, {
        success: true,
        targetType,
        draftData: parsedData,
        providerId: response.providerId,
        model: response.model,
      });
      return true;
    }

    sendJson(res, 404, { success: false, error: `Endpoint AI không tồn tại: ${pathname}` });
    return true;
  } catch (err: any) {
    console.error('[AI Server Error]:', err);
    sendJson(res, 500, {
      success: false,
      error: err.message || 'Đã xảy ra lỗi máy chủ trong quá trình xử lý AI.',
    });
    return true;
  }
}
