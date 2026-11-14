const STORAGE_KEY = 'nevidimka-chat-state-v2';

const defaultState = {
  theme: 'dark',
  activeChatId: 'chat-1',
  chats: [
    {
      id: 'chat-1',
      title: 'Поговоримо?',
      avatar: 'N',
      unread: 0,
      lastMessage: 'Nevidimka працює на базі AI',
      updatedAt: '',
      messages: [
        {
          id: 'welcome',
          sender: 'bot',
          text: 'Привіт! Я Nevidimka — AI-помічник. Напишіть повідомлення, і я відповім.',
          time: formatTime(),
          status: 'read',
        },
      ],
    },
  ],
};

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!parsed || !Array.isArray(parsed.chats) || !parsed.chats.length) return structuredClone(defaultState);
    return { ...structuredClone(defaultState), ...parsed };
  } catch {
    return structuredClone(defaultState);
  }
}

const state = loadState();
const elements = {
  chatList: document.getElementById('chat-list'),
  messageList: document.getElementById('message-list'),
  activeChatTitle: document.getElementById('active-chat-title'),
  activeChatMeta: document.getElementById('active-chat-meta'),
  activeAvatar: document.getElementById('active-avatar'),
  chatSearch: document.getElementById('chat-search'),
  messageSearch: document.getElementById('message-search'),
  input: document.getElementById('message-input'),
  newChatBtn: document.getElementById('new-chat-btn'),
  sendBtn: document.getElementById('send-btn'),
  renameChatBtn: document.getElementById('rename-chat-btn'),
  themeToggle: document.getElementById('theme-toggle'),
  quickActions: document.getElementById('quick-actions'),
  sidebar: document.getElementById('sidebar'),
  sidebarToggle: document.getElementById('sidebar-toggle'),
  attachBtn: document.getElementById('attach-btn'),
  emojiBtn: document.getElementById('emoji-btn'),
};

const suggestions = [
  'Допоможи спланувати мій день',
  'Поясни складну тему простими словами',
  'Запропонуй ідеї для нового проєкту',
];
let sending = false;

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getActiveChat() {
  let chat = state.chats.find((item) => item.id === state.activeChatId);
  if (!chat) {
    chat = state.chats[0];
    state.activeChatId = chat.id;
  }
  return chat;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[char]);
}

function applyTheme() {
  document.body.classList.toggle('light', state.theme === 'light');
  elements.themeToggle.textContent = state.theme === 'light' ? '☀️' : '🌙';
}

function renderQuickActions() {
  elements.quickActions.innerHTML = suggestions.map((text) =>
    `<button class="quick-action" type="button">${escapeHtml(text)}</button>`,
  ).join('');
  elements.quickActions.querySelectorAll('.quick-action').forEach((button) => {
    button.addEventListener('click', () => {
      elements.input.value = button.textContent.trim();
      elements.input.focus();
    });
  });
}

function renderChatList() {
  const query = elements.chatSearch.value.trim().toLocaleLowerCase('uk');
  const chats = state.chats.filter((chat) => chat.title.toLocaleLowerCase('uk').includes(query));
  elements.chatList.innerHTML = chats.length ? chats.map((chat) => `
    <button class="chat-item ${chat.id === state.activeChatId ? 'active' : ''}" type="button" data-chat-id="${escapeHtml(chat.id)}">
      <div class="chat-avatar">${escapeHtml(chat.avatar)}</div>
      <div class="chat-summary"><strong>${escapeHtml(chat.title)}</strong><small>${escapeHtml(chat.lastMessage || 'Повідомлень немає')}</small></div>
      <div class="chat-meta"><time>${escapeHtml(chat.updatedAt || '')}</time>${chat.unread ? `<span class="unread-count">${chat.unread}</span>` : ''}</div>
    </button>`).join('') : '<div class="empty-state">Чатів не знайдено</div>';

  elements.chatList.querySelectorAll('.chat-item').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeChatId = button.dataset.chatId;
      getActiveChat().unread = 0;
      saveState();
      renderAll();
      elements.sidebar.classList.add('closed');
    });
  });
}

function renderMessages() {
  const chat = getActiveChat();
  const query = elements.messageSearch.value.trim().toLocaleLowerCase('uk');
  const messages = chat.messages.filter((message) => message.text.toLocaleLowerCase('uk').includes(query));
  if (!messages.length) {
    elements.messageList.innerHTML = '<div class="empty-state">Повідомлень за цим запитом не знайдено</div>';
    return;
  }
  elements.messageList.innerHTML = messages.map((message) => `
    <div class="message-row ${message.sender === 'user' ? 'user' : ''}">
      <div class="message-bubble"><p>${escapeHtml(message.text)}</p><div class="message-meta"><span>${escapeHtml(message.time)}</span>${message.sender === 'user' ? '<span class="status-dot" title="Надіслано"></span>' : ''}</div></div>
    </div>`).join('');
  elements.messageList.scrollTop = elements.messageList.scrollHeight;
}

function renderHeader() {
  const chat = getActiveChat();
  elements.activeChatTitle.textContent = chat.title;
  elements.activeAvatar.textContent = chat.avatar;
  elements.activeChatMeta.textContent = sending ? 'Nevidimka думає…' : 'AI-помічник · онлайн';
}

function renderAll() {
  renderHeader();
  renderQuickActions();
  renderChatList();
  renderMessages();
  applyTheme();
}

function addMessage(sender, text) {
  const chat = getActiveChat();
  const time = formatTime();
  chat.messages.push({ id: `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`, sender, text, time, status: 'read' });
  chat.lastMessage = text;
  chat.updatedAt = time;
  chat.unread = 0;
  saveState();
  renderAll();
}

async function sendMessage() {
  const text = elements.input.value.trim();
  if (!text || sending) return;
  const chat = getActiveChat();
  // Capture this chat's history before adding the current message; the API appends it below.
  const history = chat.messages.slice(-20).map((message) => ({
    role: message.sender === 'user' ? 'user' : 'assistant',
    content: message.text,
  }));
  elements.input.value = '';
  addMessage('user', text);
  sending = true;
  elements.sendBtn.disabled = true;
  elements.input.disabled = true;
  renderHeader();
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [...history, { role: 'user', content: text }] }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Помилка сервера (${response.status})`);
    if (!data.reply || typeof data.reply !== 'string') throw new Error('Сервер повернув порожню відповідь.');
    // The user may have switched chats while the request was in flight.
    state.activeChatId = chat.id;
    addMessage('bot', data.reply);
  } catch (error) {
    state.activeChatId = chat.id;
    addMessage('bot', `Не вдалося отримати відповідь: ${error.message}. Перевірте, що сервер запущено та налаштовано OPENAI_API_KEY.`);
  } finally {
    sending = false;
    elements.sendBtn.disabled = false;
    elements.input.disabled = false;
    renderHeader();
    elements.input.focus();
  }
}

function createNewChat() {
  const chat = {
    id: `chat-${Date.now()}`,
    title: `Новий чат ${state.chats.length + 1}`,
    avatar: 'N', unread: 0, lastMessage: 'Почніть розмову', updatedAt: formatTime(),
    messages: [],
  };
  state.chats.unshift(chat);
  state.activeChatId = chat.id;
  elements.messageSearch.value = '';
  saveState();
  renderAll();
  elements.input.focus();
}

function renameActiveChat() {
  const chat = getActiveChat();
  const title = prompt('Введіть нову назву чату:', chat.title);
  if (title && title.trim()) {
    chat.title = title.trim().slice(0, 80);
    chat.avatar = [...chat.title][0].toUpperCase();
    saveState();
    renderAll();
  }
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  saveState();
  applyTheme();
}

function attachFile() {
  alert('Надсилання файлів ще не налаштовано.');
}

function attachEvents() {
  elements.sendBtn.addEventListener('click', sendMessage);
  elements.input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); }
  });
  elements.chatSearch.addEventListener('input', renderChatList);
  elements.messageSearch.addEventListener('input', renderMessages);
  elements.newChatBtn.addEventListener('click', createNewChat);
  elements.renameChatBtn.addEventListener('click', renameActiveChat);
  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.attachBtn.addEventListener('click', attachFile);
  elements.emojiBtn.addEventListener('click', () => { elements.input.value += ' 😊'; elements.input.focus(); });
  elements.sidebarToggle.addEventListener('click', () => elements.sidebar.classList.toggle('closed'));
}

attachEvents();
renderAll();
