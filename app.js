const STORAGE_KEY = 'nevidimka-chat-state-v1';

const defaultState = {
  theme: 'dark',
  activeChatId: 'chat-1',
  chats: [
    {
      id: 'chat-1',
      title: 'Команда проєкту',
      avatar: 'КП',
      unread: 2,
      lastMessage: 'Оновлення по запуску релізу завтра',
      updatedAt: '09:35',
      messages: [
        { id: 'm1', sender: 'bot', text: 'Привіт! Я Nevidimka. Як я можу допомогти команді сьогодні?', time: '09:20', status: 'read' },
        { id: 'm2', sender: 'user', text: 'Потрібно підготувати запуск продукту', time: '09:25', status: 'read' },
        { id: 'm3', sender: 'bot', text: 'Гаразд. Я можу допомогти скласти план, контрольні чек-листи та підсумки по релізу.', time: '09:27', status: 'read' },
      ],
    },
    {
      id: 'chat-2',
      title: 'Особистий помічник',
      avatar: 'ЛП',
      unread: 1,
      lastMessage: 'План на день готовий',
      updatedAt: 'Вчора',
      messages: [
        { id: 'm4', sender: 'user', text: 'Склади план на день', time: 'Вчора', status: 'read' },
        { id: 'm5', sender: 'bot', text: 'Ось план: 9:00 — розбір задач, 11:00 — зустріч, 15:00 — фінальна перевірка.', time: 'Вчора', status: 'read' },
      ],
    },
    {
      id: 'chat-3',
      title: 'Планування',
      avatar: 'ПЛ',
      unread: 0,
      lastMessage: 'Ми синхронізували дедлайни',
      updatedAt: 'Пн',
      messages: [
        { id: 'm6', sender: 'bot', text: 'Ми синхронізували дедлайни на тиждень.', time: 'Пн', status: 'read' },
      ],
    },
  ],
};

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

const suggestionTemplates = [
  'Розкажи більше про цей проєкт',
  'Склади короткий список задач',
  'Генеруй ідеї для зручного UX',
  'Підготуй конспект по клієнтському сценарію',
];

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      chats: parsed.chats || structuredClone(defaultState.chats),
    };
  } catch (error) {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getActiveChat() {
  return state.chats.find((chat) => chat.id === state.activeChatId) || state.chats[0];
}

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function applyTheme() {
  document.body.classList.toggle('light', state.theme === 'light');
  elements.themeToggle.textContent = state.theme === 'light' ? '☀️' : '🌙';
}

function renderQuickActions() {
  elements.quickActions.innerHTML = suggestionTemplates
    .map(
      (item) => `
        <button class="quick-action" type="button">${item}</button>
      `,
    )
    .join('');

  elements.quickActions.querySelectorAll('.quick-action').forEach((button) => {
    button.addEventListener('click', () => {
      elements.input.value = button.textContent.trim();
      elements.input.focus();
    });
  });
}

function renderChatList() {
  const query = elements.chatSearch.value.trim().toLowerCase();
  const visibleChats = state.chats.filter((chat) => chat.title.toLowerCase().includes(query));

  if (!visibleChats.length) {
    elements.chatList.innerHTML = '<div class="empty-state">Нічого не знайдено</div>';
    return;
  }

  elements.chatList.innerHTML = visibleChats
    .map(
      (chat) => `
        <button class="chat-item ${chat.id === state.activeChatId ? 'active' : ''}" type="button" data-chat-id="${chat.id}">
          <div class="chat-avatar">${chat.avatar}</div>
          <div class="chat-summary">
            <strong>${chat.title}</strong>
            <small>${chat.lastMessage || 'Повідомлень немає'}</small>
          </div>
          <div class="chat-meta">
            <time>${chat.updatedAt}</time>
            ${chat.unread > 0 ? `<span class="unread-count">${chat.unread}</span>` : ''}
          </div>
        </button>
      `,
    )
    .join('');

  elements.chatList.querySelectorAll('.chat-item').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeChatId = button.dataset.chatId;
      const target = getActiveChat();
      target.unread = 0;
      saveState();
      renderAll();
    });
  });
}

function renderMessages() {
  const activeChat = getActiveChat();
  const query = elements.messageSearch.value.trim().toLowerCase();
  const messages = activeChat.messages.filter((message) => message.text.toLowerCase().includes(query));

  if (!messages.length) {
    elements.messageList.innerHTML = '<div class="empty-state">У цьому чаті немає повідомлень, що відповідають пошуку</div>';
    return;
  }

  elements.messageList.innerHTML = messages
    .map(
      (message) => `
        <div class="message-row ${message.sender === 'user' ? 'user' : ''}">
          <div class="message-bubble">
            <p>${escapeHtml(message.text)}</p>
            <div class="message-meta">
              <span>${message.time}</span>
              ${message.sender === 'user' ? '<span class="status-dot" title="Надіслано"></span>' : ''}
            </div>
          </div>
        </div>
      `,
    )
    .join('');
}

function renderHeader() {
  const activeChat = getActiveChat();
  elements.activeChatTitle.textContent = activeChat.title;
  elements.activeAvatar.textContent = activeChat.avatar;
  elements.activeChatMeta.textContent = `${activeChat.messages.length} повідомлень · готовий до обговорення`;
}

function renderAll() {
  renderHeader();
  renderQuickActions();
  renderChatList();
  renderMessages();
  applyTheme();
}

function generateBotReply(input) {
  const text = input.toLowerCase().trim();

  if (text.includes('привіт') || text.includes('hi') || text.includes('hello')) {
    return 'Привіт! Чим я можу допомогти вам сьогодні?';
  }

  if (text.includes('план') || text.includes('задач')) {
    return 'Гаразд. Я можу скласти короткий план із 3 кроків: оцінка задач, розподіл відповідальностей і дедлайни.';
  }

  if (text.includes('ідея') || text.includes('дизайн') || text.includes('ux')) {
    return 'Ось ідея: зробити простий, чистий інтерфейс з чіткими блоками, акцентом на швидку навігацію та легкому читанні.';
  }

  if (text.includes('допомога') || text.includes('help')) {
    return 'Звісно. Я готовий допомагати з плануванням, структурою інтерфейсу, написанням текстів або підготовкою сценаріїв.';
  }

  if (text.includes('спасибі') || text.includes('thanks')) {
    return 'Радий допомогти. Якщо потрібно, можу запропонувати ще варіанти або підготувати план дій.';
  }

  return 'Це дуже цікаве питання. Я можу допомогти з ідеєю, структурою, планом задач або коротким описом рішення.';
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function addMessage(sender, text) {
  const chat = getActiveChat();
  const time = formatTime();
  const nextMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    sender,
    text,
    time,
    status: sender === 'user' ? 'sent' : 'read',
  };

  chat.messages.push(nextMessage);
  chat.lastMessage = text;
  chat.updatedAt = time;
  chat.unread = sender === 'bot' ? chat.unread + 1 : 0;
  saveState();
  renderAll();
}

function sendMessage() {
  const text = elements.input.value.trim();
  if (!text) return;

  addMessage('user', text);
  elements.input.value = '';

  const reply = generateBotReply(text);
  setTimeout(() => {
    addMessage('bot', reply);
  }, 500);
}

function createNewChat() {
  const count = state.chats.length + 1;
  const title = `Новий чат ${count}`;
  const newChat = {
    id: `chat-${Date.now()}`,
    title,
    avatar: title.slice(0, 2).toUpperCase(),
    unread: 0,
    lastMessage: 'Почніть обговорення',
    updatedAt: formatTime(),
    messages: [
      {
        id: `msg-${Date.now()}`,
        sender: 'bot',
        text: 'Привіт! Я готовий допомогти в новому чаті. Чим займаємося?',
        time: formatTime(),
        status: 'read',
      },
    ],
  };

  state.chats.unshift(newChat);
  state.activeChatId = newChat.id;
  saveState();
  renderAll();
}

function renameActiveChat() {
  const chat = getActiveChat();
  const nextTitle = prompt('Введіть нову назву чату:', chat.title);
  if (nextTitle && nextTitle.trim()) {
    chat.title = nextTitle.trim();
    saveState();
    renderAll();
  }
}

function deleteActiveChat() {
  const chat = getActiveChat();
  if (state.chats.length === 1) {
    alert('Не можна видалити останній чат. Спочатку створіть новий.');
    return;
  }

  const confirmed = confirm(`Видалити чат "${chat.title}"?`);
  if (!confirmed) return;

  state.chats = state.chats.filter((item) => item.id !== chat.id);
  state.activeChatId = state.chats[0].id;
  saveState();
  renderAll();
}

function attachFile() {
  const text = '📎 Файл прикріплено до чату. Ти можеш натиснути, щоб переглянути деталі.';
  addMessage('user', text);
  setTimeout(() => {
    addMessage('bot', 'Файл успішно прикріплено. Я можу підсумувати його вміст або допомогти з обробкою.');
  }, 350);
}

function addEmoji() {
  const current = elements.input.value;
  const emoji = ' 😊✨🚀';
  elements.input.value = `${current}${emoji}`;
  elements.input.focus();
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  saveState();
  applyTheme();
}

function handleSidebarToggle() {
  elements.sidebar.classList.toggle('closed');
}

function attachEvents() {
  elements.sendBtn.addEventListener('click', sendMessage);
  elements.input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  });

  elements.chatSearch.addEventListener('input', renderChatList);
  elements.messageSearch.addEventListener('input', renderMessages);
  elements.newChatBtn.addEventListener('click', createNewChat);
  elements.renameChatBtn.addEventListener('click', renameActiveChat);
  elements.renameChatBtn.addEventListener('dblclick', deleteActiveChat);
  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.attachBtn.addEventListener('click', attachFile);
  elements.emojiBtn.addEventListener('click', addEmoji);
  elements.sidebarToggle.addEventListener('click', handleSidebarToggle);
}

attachEvents();
applyTheme();
renderAll();
