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
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramAllowedChatIds = new Set(
  (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value)),
);
const telegramChatHistory = new Map();

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

function normalizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 21) {
    throw Object.assign(new Error('Provide between 1 and 21 conversation messages.'), { status: 400 });
  }

  const normalized = messages.map((message) => {
    if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string') {
      throw Object.assign(new Error('Each message must have a user or assistant role and text content.'), { status: 400 });
    }

    const content = message.content.trim();
    if (!content || content.length > 8000) {
      throw Object.assign(new Error('Messages must be 1–8000 characters.'), { status: 400 });
    }

    return { role: message.role, content };
  });

  if (normalized[normalized.length - 1].role !== 'user') {
    throw Object.assign(new Error('The last message must be from the user.'), { status: 400 });
  }

  return normalized;
}

async function generateAiReply(messages) {
  if (!apiKey) throw Object.assign(new Error('AI is not configured. Set OPENAI_API_KEY on the server.'), { status: 503 });

  const normalizedMessages = normalizeMessages(messages);
  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are Nevidimka, a helpful, friendly AI assistant. Reply in the user’s language. Be clear and useful.' },
        ...normalizedMessages,
      ],
      max_tokens: 1200,
    }),
    signal: AbortSignal.timeout(60000),
  });

  const result = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    console.error('AI provider returned an error:', upstream.status, result.error?.message || 'Unknown provider error');
    throw Object.assign(new Error('AI provider request failed. Check server key, model, and provider account.'), { status: 502 });
  }

  const reply = result.choices?.[0]?.message?.content?.trim();
  if (!reply) throw Object.assign(new Error('AI provider returned no text.'), { status: 502 });

  return reply;
}

async function handleChat(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { error: 'Method not allowed.' });
  }

  try {
    const body = await readJsonBody(request);
    const reply = await generateAiReply(body.messages || []);
    return sendJson(response, 200, { reply });
  } catch (error) {
    console.error('Chat request failed:', error.message);
    return sendJson(response, error.status || (error.name === 'TimeoutError' ? 504 : 500), {
      error: error.status ? error.message : error.name === 'TimeoutError' ? 'AI request timed out.' : 'Unable to reach the AI provider.',
    });
  }
}

async function sendTelegramMessage(chatId, text) {
  if (!telegramToken) return;

  const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.description || 'Telegram sendMessage failed.');
  }
}

async function handleTelegramUpdate(update) {
  if (!update?.message || !update.message.text) return;

  const chatId = Number(update.message.chat?.id);
  if (!Number.isFinite(chatId)) return;
  if (telegramAllowedChatIds.size > 0 && !telegramAllowedChatIds.has(chatId)) return;

  const messageText = update.message.text.trim();
  if (!messageText) return;

  const historyKey = String(chatId);
  const previousHistory = telegramChatHistory.get(historyKey) || [];
  const nextHistory = [...previousHistory, { role: 'user', content: messageText }].slice(-20);

  try {
    const reply = await generateAiReply(nextHistory);
    const withReply = [...nextHistory, { role: 'assistant', content: reply }].slice(-20);
    telegramChatHistory.set(historyKey, withReply);
    await sendTelegramMessage(chatId, reply);
  } catch (error) {
    console.error('Telegram message failed:', error.message);
    await sendTelegramMessage(chatId, `Не вдалося отримати відповідь: ${error.message}`);
  }
}

async function startTelegramBot() {
  if (!telegramToken) {
    console.log('Telegram bot disabled: TELEGRAM_BOT_TOKEN is not set.');
    return;
  }

  console.log('Telegram bot enabled. Polling for messages...');
  let offset = 0;

  while (true) {
    try {
      const url = new URL(`https://api.telegram.org/bot${telegramToken}/getUpdates`);
      url.searchParams.set('offset', String(offset));
      url.searchParams.set('timeout', '30');
      url.searchParams.set('allowed_updates', JSON.stringify(['message']));

      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.description || 'Telegram API request failed.');
      }

      for (const update of data.result || []) {
        offset = Math.max(offset, Number(update.update_id) + 1);
        await handleTelegramUpdate(update);
      }
    } catch (error) {
      console.error('Telegram polling error:', error.message);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
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
  if (telegramToken) {
    startTelegramBot().catch((error) => {
      console.error('Telegram bot failed to start:', error.message);
    });
  }
});

export { generateAiReply };
