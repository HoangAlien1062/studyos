/**
 * Standalone Node.js Production HTTP Server for StudyOS AI Engine
 * Run with: npx.cmd tsx server/standalone.ts
 */

import http from 'node:http';
import { handleAIRequest } from './ai/index';

const PORT = parseInt(process.env.AI_SERVER_PORT || '5001', 10);

const server = http.createServer(async (req, res) => {
  if (req.url?.startsWith('/api/ai') || req.url?.startsWith('/api/health') || req.url === '/health') {
    const handled = await handleAIRequest(req, res);
    if (handled) return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`\n🚀 [StudyOS AI Engine] Máy chủ AI độc lập đang chạy tại: http://localhost:${PORT}`);
  console.log(`   - Endpoint AI: http://localhost:${PORT}/api/ai/chat`);
  console.log(`   - Health check: http://localhost:${PORT}/health\n`);
});
