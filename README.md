# Nevidimka Chat

A small full-stack AI chat app. The browser UI talks to a Node.js server, which keeps the OpenAI API key private and sends conversation context to the AI provider. Chats are stored in the browser's local storage.

## Run locally

Requirements: Node.js 20+ and an OpenAI API key with API access/billing enabled.

1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY` to your own key. Do not commit `.env` or put the key in browser code.
2. Load environment variables and start the server:

```bash
# macOS/Linux
set -a && . ./.env && set +a && npm start

# PowerShell
Get-Content .env | ForEach-Object { if ($_ -match '^([^#][^=]*)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2]) } }
npm start
```

3. Open http://localhost:3000.

The chat API endpoint is `POST /api/chat`. It accepts a JSON `messages` array with `user`/`assistant` roles. The server validates message sizes and calls OpenAI's Chat Completions API. `OPENAI_MODEL` can be changed to another model available to your API account.

## Deploy

This app needs a Node.js host; GitHub Pages alone cannot run the backend. Deploy the repository to a Node-compatible host and set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`/`PORT`) in that host's environment settings. Never commit your real key. Chat data currently remains in the browser and is not shared across devices.
