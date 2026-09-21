/**
 * Standalone Node.js Production HTTP Server for StudyOS Backend Engine
 * Run with: npx.cmd tsx server/standalone.ts
 */

import http from 'node:http';
import { handleServerRequest } from './index';

const PORT = parseInt(process.env.AI_SERVER_PORT || process.env.PORT || '5001', 10);

const server = http.createServer(async (req, res) => {
  if (req.url?.startsWith('/api/') || req.url === '/health') {
    const handled = await handleServerRequest(req, res);
    if (handled) return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint Not Found' }));
});

server.listen(PORT, () => {
  console.log(`\n🚀 [StudyOS Backend Engine] Máy chủ đang chạy tại: http://localhost:${PORT}`);
  console.log(`   - AI Chat: http://localhost:${PORT}/api/ai/chat`);
  console.log(`   - Google Drive Storage: http://localhost:${PORT}/api/storage/status`);
  console.log(`   - Admin API: http://localhost:${PORT}/api/admin/overview`);
  console.log(`   - Health check: http://localhost:${PORT}/health\n`);
});
