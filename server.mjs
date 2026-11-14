import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const maxBodyBytes = 64 * 1024;
const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};

function sendJson(response, status, data) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(data));
}

async function readJsonBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBodyBytes) throw Object.assign(new Error('Request body is too large.'), { status: 413 });
  }
  try { return JSON.parse(body); } catch { throw Object.assign(new Error('Invalid JSON body.'), { status: 400 }); }
}

async function handleChat(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { error: 'Method not allowed.' });
  }
  if (!apiKey) return sendJson(response, 503, { error: 'AI is not configured. Set OPENAI_API_KEY on the server.' });

  try {
    const body = await readJsonBody(request);
    if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 21) {
      return sendJson(response, 400, { error: 'Provide between 1 and 21 conversation messages.' });
    }
    const messages = body.messages.map((message) => {
      if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string') {
        throw Object.assign(new Error('Each message must have a user or assistant role and text content.'), { status: 400 });
      }
      const content = message.content.trim();
      if (!content || content.length > 8000) throw Object.assign(new Error('Messages must be 1–8000 characters.'), { status: 400 });
      return { role: message.role, content };
    });
    if (messages[messages.length - 1].role !== 'user') return sendJson(response, 400, { error: 'The last message must be from the user.' });

    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are Nevidimka, a helpful, friendly AI assistant. Reply in the user’s language. Be clear and useful.' },
          ...messages,
        ],
        max_tokens: 1200,
      }),
      signal: AbortSignal.timeout(60000),
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('AI provider returned an error:', upstream.status, result.error?.message || 'Unknown provider error');
      const status = upstream.status === 401 || upstream.status === 403 ? 502 : 502;
      return sendJson(response, status, { error: 'AI provider request failed. Check server key, model, and provider account.' });
    }
    const reply = result.choices?.[0]?.message?.content?.trim();
    if (!reply) return sendJson(response, 502, { error: 'AI provider returned no text.' });
    return sendJson(response, 200, { reply });
  } catch (error) {
    console.error('Chat request failed:', error.message);
    return sendJson(response, error.status || (error.name === 'TimeoutError' ? 504 : 500), {
      error: error.status ? error.message : error.name === 'TimeoutError' ? 'AI request timed out.' : 'Unable to reach the AI provider.',
    });
  }
}

const server = createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/api/chat') return handleChat(request, response);
  if (request.method !== 'GET' && request.method !== 'HEAD') return sendJson(response, 405, { error: 'Method not allowed.' });

  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return sendJson(response, 400, { error: 'Invalid URL.' }); }
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.resolve(root, `.${pathname}`);
  if (!filePath.startsWith(`${root}${path.sep}`)) return sendJson(response, 403, { error: 'Forbidden.' });
  try {
    const contents = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    response.end(request.method === 'HEAD' ? undefined : contents);
  } catch {
    sendJson(response, 404, { error: 'Not found.' });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Nevidimka chat listening on http://localhost:${port}`);
  if (!apiKey) console.warn('OPENAI_API_KEY is not set; chat responses will be unavailable until configured.');
});
