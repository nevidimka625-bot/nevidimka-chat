# Nevidimka Chat

A small full-stack AI chat app. The browser UI talks to a Node.js server, which keeps the OpenAI API key private and sends conversation context to the AI provider. Chats are stored in the browser's local storage.

## Run locally

Requirements: Node.js 20+ and an OpenAI API key with API access/billing enabled.

1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY` to your own key. Do not commit `.env` or put the key in browser code.
2. Optionally set `TELEGRAM_BOT_TOKEN` to enable Telegram bot mode. If you want to restrict access, also set `TELEGRAM_ALLOWED_CHAT_IDS` as a comma-separated list of Telegram chat IDs.
3. Load environment variables and start the server:

```bash
# macOS/Linux
set -a && . ./.env && set +a && npm start

# PowerShell
Get-Content .env | ForEach-Object { if ($_ -match '^([^#][^=]*)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2]) } }
npm start
```

4. Open http://localhost:3000.

The chat API endpoint is `POST /api/chat`. It accepts a JSON `messages` array with `user`/`assistant` roles. The server validates message sizes and calls OpenAI's Chat Completions API. `OPENAI_MODEL` defaults to `gpt-4o-mini`.

When `TELEGRAM_BOT_TOKEN` is configured, the app also starts a Telegram polling bot. Messages from allowed chats are sent to the same AI backend and the reply is posted back to Telegram.

## Deploy

This app needs a Node.js host; GitHub Pages alone cannot run the backend. Deploy the repository to a Node-compatible host and set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, `PORT`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_ALLOWED_CHAT_IDS`) in that host's environment.

For GitHub Actions, store secrets like `OPENAI_API_KEY` and `TELEGRAM_BOT_TOKEN` in the repository settings and reference them as `${{ secrets.NAME }}`.
