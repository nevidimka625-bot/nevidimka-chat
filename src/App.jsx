import { useMemo, useState } from 'react';
import {
  Bell, Bookmark, Check, ChevronDown, Compass, Ellipsis, Heart, Home,
  Image, Menu, MessageCircle, MessageSquareText, MoreHorizontal, Plus,
  Search, Send, Settings, Share2, Smile, Sparkles, Users, X,
} from 'lucide-react';

const initialPosts = [
  {
    id: 1,
    name: 'Софія Коваленко',
    handle: '@sofia.k',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    time: '12 хв тому',
    location: 'Львів, Україна',
    text: 'Іноді найкращі плани — це жодних планів. Просто кава, сонце і місто, яке сьогодні особливо красиве ☀️',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    likes: 128,
    comments: 18,
    liked: false,
  },
  {
    id: 2,
    name: 'Максим Левченко',
    handle: '@max.lev',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    time: '1 год тому',
    location: 'Київ',
    text: 'Маленьке нагадування: ти не мусиш мати все під контролем, щоб рухатися вперед. Один крок — це вже прогрес. 🌱',
    likes: 86,
    comments: 9,
    liked: true,
  },
  {
    id: 3,
    name: 'Аліна Марчук',
    handle: '@alinamakes',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
    time: '3 год тому',
    location: 'Одеса',
    text: 'Зібрала плейлист для тих вечорів, коли хочеться трохи помріяти. Яку пісню додати? 🎧',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80',
    likes: 214,
    comments: 32,
    liked: false,
  },
];

const stories = [
  { name: 'Твоя історія', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80', own: true },
  { name: 'Софія', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80' },
  { name: 'Максим', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80' },
  { name: 'Аліна', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=160&q=80' },
  { name: 'Марія', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=80' },
  { name: 'Данило', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80' },
];

const suggestedPeople = [
  { name: 'Данило Романюк', handle: '@danylo.r', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80', mutual: '12 спільних друзів' },
  { name: 'Марія Бойко', handle: '@maria.bo', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=200&q=80', mutual: '8 спільних друзів' },
  { name: 'Артем Сокіл', handle: '@art.sokil', avatar: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=200&q=80', mutual: '5 спільних друзів' },
];

function Avatar({ src, size = 'md', online = false, className = '' }) {
  return (
    <span className={`avatar avatar-${size} ${online ? 'is-online' : ''} ${className}`.trim()}>
      <img src={src} alt="" />
    </span>
  );
}

function Brand() {
  return (
    <a className="brand" href="#home" aria-label="Nevidimka — головна сторінка">
      <span className="brand-mark"><span /></span>
      <span>nevidimka</span>
    </a>
  );
}

export default function App() {
  const [posts, setPosts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nevidimka-posts')) || initialPosts;
    } catch {
      return initialPosts;
    }
  });
  const [activeTab, setActiveTab] = useState('Стрічка');
  const [feedFilter, setFeedFilter] = useState('Для тебе');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [toast, setToast] = useState('');
  const [following, setFollowing] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [openComments, setOpenComments] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const haystack = `${post.name} ${post.handle} ${post.text}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
  }, [posts, query]);

  const nav = [
    { label: 'Стрічка', icon: Home },
    { label: 'Знайти людей', icon: Compass },
    { label: 'Повідомлення', icon: MessageSquareText, badge: '3' },
    { label: 'Сповіщення', icon: Bell, badge: '2' },
    { label: 'Збережене', icon: Bookmark },
  ];

  function updatePosts(newPosts) {
    setPosts(newPosts);
    try {
      localStorage.setItem('nevidimka-posts', JSON.stringify(newPosts));
    } catch {
      // ignore storage errors in demo mode
    }
  }

  function showToast(message) {
    setToast(message);
    window.clearTimeout(window.__nevidimkaToast);
    window.__nevidimkaToast = window.setTimeout(() => setToast(''), 2600);
  }

  function publishPost() {
    if (!draft.trim()) return;
    const newPost = {
      id: Date.now(),
      name: 'Олена Савчук',
      handle: '@olena',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      time: 'щойно',
      location: 'Київ',
      text: draft.trim(),
      likes: 0,
      comments: 0,
      liked: false,
    };
    updatePosts([newPost, ...posts]);
    setDraft('');
    showToast('Твій допис опубліковано ✨');
  }

  function toggleLike(postId) {
    updatePosts(
      posts.map((post) => {
        if (post.id !== postId) return post;
        const nextLiked = !post.liked;
        return {
          ...post,
          liked: nextLiked,
          likes: post.likes + (nextLiked ? 1 : -1),
        };
      }),
    );
  }

  function addComment(postId) {
    if (!commentDraft.trim()) return;
    updatePosts(
      posts.map((post) =>
        post.id === postId ? { ...post, comments: post.comments + 1 } : post,
      ),
    );
    setCommentDraft('');
    showToast('Коментар додано');
  }

  function toggleFollow(handle) {
    const isFollowed = following.includes(handle);
    setFollowing((cur) =>
      isFollowed ? cur.filter((item) => item !== handle) : [...cur, handle],
    );
    showToast(isFollowed ? 'Підписку скасовано' : 'Тепер ви підписані');
  }

  function toggleSaved(postId) {
    const exists = savedPosts.includes(postId);
    setSavedPosts((cur) =>
      exists ? cur.filter((id) => id !== postId) : [...cur, postId],
    );
    showToast(exists ? 'Видалено зі збережених' : 'Допис збережено');
  }

  function selectNav(label) {
    setActiveTab(label);
    setMobileMenu(false);
    if (label !== 'Стрічка') {
      showToast(`${label} — демонстраційний розділ`);
    }
  }

  return (
    <div className="app-shell" id="home">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="mobile-menu icon-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Відкрити меню">
            <Menu size={20} />
          </button>

          <Brand />

          <label className="search-box" aria-label="Пошук">
            <Search size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Шукай людей, теми, ідеї..." />
            <kbd>⌘ K</kbd>
          </label>

          <div className="top-actions">
            <button className="icon-button top-bell" onClick={() => selectNav('Сповіщення')} aria-label="Сповіщення">
              <Bell size={19} />
              <i />
            </button>
            <button className="profile-chip" onClick={() => showToast('Профіль відкрито')}>
              <Avatar src={stories[0].avatar} size="sm" />
              <span>Олена</span>
              <ChevronDown size={15} />
            </button>
          </div>
        </div>
      </header>

      <div className="layout">
        <aside className={`left-sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
          <div className="sidebar-profile">
            <Avatar src={stories[0].avatar} size="lg" online />
            <div>
              <strong>Олена Савчук</strong>
              <span>@olena</span>
            </div>
            <button className="icon-button subtle" onClick={() => showToast('Налаштування профілю')} aria-label="Налаштування">
              <Settings size={16} />
            </button>
          </div>

          <div className="profile-stats">
            <div>
              <strong>248</strong>
              <span>друзів</span>
            </div>
            <div>
              <strong>1.8k</strong>
              <span>читачів</span>
            </div>
            <div>
              <strong>36</strong>
              <span>дописів</span>
            </div>
          </div>

          <div className="nav-label">Меню</div>
          <nav className="side-nav">
            {nav.map(({ label, icon: Icon, badge }) => (
              <button key={label} className={`nav-item ${activeTab === label ? 'active' : ''}`} onClick={() => selectNav(label)}>
                <Icon size={18} />
                <span>{label}</span>
                {badge && <b>{badge}</b>}
              </button>
            ))}
          </nav>

          <div className="nav-label">Твої спільноти</div>
          <button className="community-link" onClick={() => showToast('Спільнота «Творчі люди»')}>
            <span className="community-icon coral">✦</span>
            <span>Творчі люди</span>
            <small>2.4k</small>
          </button>
          <button className="community-link" onClick={() => showToast('Спільнота «Мандрівники»')}>
            <span className="community-icon lilac">⌁</span>
            <span>Мандрівники</span>
            <small>1.8k</small>
          </button>
          <button className="community-link" onClick={() => showToast('Спільнота «Книголюби»')}>
            <span className="community-icon mint">▣</span>
            <span>Книголюби</span>
            <small>960</small>
          </button>
          <button className="explore-link" onClick={() => showToast('Пошук спільнот')}>
            <Plus size={15} /> Знайти спільноти
          </button>

          <div className="sidebar-promo">
            <Sparkles size={16} />
            <strong>Будь собою.</strong>
            <p>Твій простір, твої люди, твої правила.</p>
            <span>nevidimka.social</span>
          </div>

          <div className="footer-links">
            Про нас · Правила · Конфіденційність<br />
            © 2025 Nevidimka
          </div>
        </aside>

        <main className="feed-column">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">
                <span className="live-dot" /> Твоє коло
              </div>
              <h1>Привіт, Олено <span>✦</span></h1>
              <p>Що нового в твоїх людей?</p>
            </div>
            <button className="compose-shortcut" onClick={() => document.getElementById('composer-input')?.focus()}>
              <Plus size={17} /> Створити допис
            </button>
          </section>

          <section className="stories-card">
            <div className="section-heading">
              <div>
                <h2>Історії</h2>
                <span>Моменти, що зникають за 24 години</span>
              </div>
              <button className="text-button" onClick={() => showToast('Усі історії')}>
                Усі історії <span>→</span>
              </button>
            </div>
            <div className="stories-row">
              {stories.map((story) => (
                <button key={story.name} className="story" onClick={() => showToast(story.own ? 'Створити історію' : `Історія: ${story.name}`)}>
                  <span className={`story-ring ${story.own ? 'own' : ''}`}>
                    <Avatar src={story.avatar} size="story" />
                    {story.own && <span className="story-plus"><Plus size={12} /></span>}
                  </span>
                  <span>{story.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="composer-card">
            <Avatar src={stories[0].avatar} size="md" />
            <div className="composer-content">
              <textarea
                id="composer-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                placeholder="Поділись думкою, Олено..."
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') publishPost();
                }}
              />
              <div className="composer-tools">
                <div>
                  <button onClick={() => showToast('Фото скоро додамо')}>
                    <Image size={16} />
                    <span>Фото</span>
                  </button>
                  <button onClick={() => showToast('Емоції скоро додамо')}>
                    <Smile size={16} />
                    <span>Настрій</span>
                  </button>
                </div>
                <button className="primary-button" onClick={publishPost} disabled={!draft.trim()}>
                  <Send size={14} /> Опублікувати
                </button>
              </div>
            </div>
          </section>

          <div className="feed-toolbar">
            <div className="feed-tabs">
              {['Для тебе', 'Підписки', 'Популярне'].map((tab) => (
                <button key={tab} className={feedFilter === tab ? 'selected' : ''} onClick={() => setFeedFilter(tab)}>
                  {tab}
                  {tab === 'Популярне' && <Sparkles size={12} />}
                </button>
              ))}
            </div>
            <button className="filter-button" onClick={() => showToast('Фільтри застосовано')}>
              <span>↕</span> Фільтр
            </button>
          </div>

          <div className="posts-list">
            {filteredPosts.length ? (
              filteredPosts.map((post) => (
                <article className="post-card" key={post.id}>
                  <div className="post-head">
                    <Avatar src={post.avatar} size="md" online={post.id === 1} />
                    <div className="post-author">
                      <strong>
                        {post.name}
                        <span className="verified"><Check size={10} /></span>
                      </strong>
                      <div>
                        <span>{post.handle}</span>
                        <i>·</i>
                        <span>{post.time}</span>
                        {post.location && <>
                          <i>·</i>
                          <span>{post.location}</span>
                        </>}
                      </div>
                    </div>
                    <button className="icon-button post-more" onClick={() => showToast('Дії з дописом')} aria-label="Більше дій">
                      <MoreHorizontal size={18} />
                    </button>
                  </div>

                  <p className="post-text">{post.text}</p>

                  {post.image && (
                    <button className="post-image" onClick={() => showToast('Перегляд фото')}>
                      <img src={post.image} alt="Фото із допису" />
                    </button>
                  )}

                  <div className="post-engagement">
                    <span><span className="mini-hearts">♥</span> {post.likes} вподобань</span>
                    <button onClick={() => setOpenComments(openComments === post.id ? null : post.id)}>
                      {post.comments} коментарів
                    </button>
                  </div>

                  <div className="post-actions">
                    <button className={post.liked ? 'liked' : ''} onClick={() => toggleLike(post.id)}>
                      <Heart size={16} fill={post.liked ? 'currentColor' : 'none'} />
                      <span>Подобається</span>
                    </button>
                    <button onClick={() => setOpenComments(openComments === post.id ? null : post.id)}>
                      <MessageCircle size={16} />
                      <span>Коментувати</span>
                    </button>
                    <button onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                      showToast('Посилання скопійовано');
                    }}>
                      <Share2 size={16} />
                      <span>Поділитися</span>
                    </button>
                    <button onClick={() => toggleSaved(post.id)} className={savedPosts.includes(post.id) ? 'saved' : ''} aria-label="Зберегти допис">
                      <Bookmark size={16} fill={savedPosts.includes(post.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  {openComments === post.id && (
                    <div className="comment-box">
                      <Avatar src={stories[0].avatar} size="sm" />
                      <input
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addComment(post.id)}
                        placeholder="Напиши коментар..."
                      />
                      <button onClick={() => addComment(post.id)} disabled={!commentDraft.trim()} aria-label="Надіслати">
                        <Send size={14} />
                      </button>
                    </div>
                  )}
                </article>
              ))
            ) : (
              <div className="empty-state">
                <Search size={23} />
                <strong>Нічого не знайдено</strong>
                <span>Спробуй інший запит.</span>
              </div>
            )}
          </div>

          <div className="end-of-feed">
            <span /> Ти все переглянула <span />
          </div>
        </main>

        <aside className="right-sidebar">
          <section className="right-card suggestions">
            <div className="right-title">
              <div>
                <h2>Можливо, знайомі</h2>
                <span>Люди, з якими є спільне</span>
              </div>
              <button aria-label="Знайти людей" onClick={() => selectNav('Знайти людей')}>
                <Ellipsis size={18} />
              </button>
            </div>

            {suggestedPeople.map((person) => {
              const isFollowed = following.includes(person.handle);
              return (
                <div className="suggestion" key={person.handle}>
                  <Avatar src={person.avatar} size="sm" />
                  <div className="suggestion-info">
                    <strong>{person.name}</strong>
                    <span>{person.mutual}</span>
                  </div>
                  <button className={`follow-button ${isFollowed ? 'following' : ''}`} onClick={() => toggleFollow(person.handle)}>
                    {isFollowed ? <Check size={14} /> : <Plus size={14} />}
                  </button>
                </div>
              );
            })}

            <button className="see-all" onClick={() => selectNav('Знайти людей')}>
              Знайти більше людей <span>→</span>
            </button>
          </section>

          <section className="right-card trending">
            <div className="right-title">
              <div>
                <h2>Зараз обговорюють</h2>
                <span>Теми у твоєму колі</span>
              </div>
              <Sparkles size={16} className="trending-spark" />
            </div>

            {[
              ['01', 'життя в моменті', '2.4 тис. дописів', '#f0eafa'],
              ['02', 'маленькі радощі', '1.8 тис. дописів', '#e7f4ed'],
              ['03', 'українська музика', '956 дописів', '#fff0e8'],
            ].map(([num, label, count, color]) => (
              <button className="trend" key={label} onClick={() => {
                setQuery(label);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}>
                <span className="trend-num" style={{ background: color }}>{num}</span>
                <span>
                  <strong>#{label}</strong>
                  <small>{count}</small>
                </span>
                <ChevronDown size={15} className="trend-arrow" />
              </button>
            ))}
          </section>

          <section className="message-peek" onClick={() => selectNav('Повідомлення')}>
            <div className="message-icon"><MessageSquareText size={18} /></div>
            <div>
              <strong>Твої повідомлення</strong>
              <span>3 непрочитані · Перейти</span>
            </div>
            <span className="message-count">3</span>
          </section>

          <div className="right-footer">
            Зроблено з турботою в Україні <span>♡</span><br />
            Допомога · Умови · Конфіденційність
          </div>
        </aside>
      </div>

      <nav className="mobile-nav">
        {[
          [Home, 'Стрічка'],
          [Compass, 'Знайти'],
          [Plus, 'Створити'],
          [MessageSquareText, 'Повідомлення'],
        ].map(([Icon, label]) => (
          <button
            key={label}
            className={label === 'Стрічка' && activeTab === 'Стрічка' ? 'active' : ''}
            onClick={() => {
              if (label === 'Створити') {
                document.getElementById('composer-input')?.focus();
                return;
              }
              selectNav(label === 'Знайти' ? 'Знайти людей' : label === 'Повідомлення' ? 'Повідомлення' : 'Стрічка');
            }}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
        <button className="mobile-profile" onClick={() => showToast('Профіль')}>
          <Avatar src={stories[0].avatar} size="nav" />
          <span>Профіль</span>
        </button>
      </nav>

      {toast && (
        <div className="toast">
          <span>✦</span>
          {toast}
          <button onClick={() => setToast('')} aria-label="Закрити сповіщення">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
