// =============================================
// WILD AND DEADLY — Main Application
// =============================================

const GEMINI_API_KEY = 'AIzaSyDA0GhN6rgBjMNO4uGffXo_FaCJnp7TR8w';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

// State
let currentPage = 0;
let totalPages = 0;
let currentChapter = 0;
let currentCreatures = [];
let bookmarks = JSON.parse(localStorage.getItem('wd_bookmarks') || '[]');
let dangerFilterActive = false;
let isSearching = false;
let isMobile = window.innerWidth <= 900;
let deferredPrompt = null;
let currentLang = localStorage.getItem('wd_lang') || 'en';

// Touch state for swipe
let touchStartX = 0;
let touchEndX = 0;
let isDragging = false;
let dragStartX = 0;
let dragOffset = 0;

// ================ I18N ================
function t(key, index) {
  if (currentLang === 'ru' && typeof RUSSIAN !== 'undefined') {
    // Handle nested keys
    const parts = key.split('.');
    let obj = RUSSIAN;
    for (const part of parts) {
      obj = obj[part];
      if (obj === undefined) return getEnglishFallback(key, index);
    }
    if (index !== undefined && Array.isArray(obj)) {
      return obj[index] || getEnglishFallback(key, index);
    }
    return obj || getEnglishFallback(key, index);
  }
  return getEnglishFallback(key, index);
}

function getEnglishFallback(key, index) {
  // English fallbacks
  const EN = {
    'ui.appTitle': '⚡ Wild & Deadly',
    'ui.appSubtitle': '100 Extreme Creatures',
    'ui.searchPlaceholder': 'Search creatures...',
    'ui.filterBtn': '💀 Filter',
    'ui.filterActive': '💀🔴',
    'ui.randomBtn': '🎲 Random',
    'ui.bookmarksBtn': '🔖 Bookmarks',
    'ui.installText': '📲 Install Wild & Deadly for offline reading',
    'ui.installBtn': 'Install',
    'ui.prevBtn': '◀ Back',
    'ui.nextBtn': 'Next ▶',
    'ui.swipeHint': 'Swipe or click arrows to turn pages',
    'ui.pageOf': 'Page',
    'ui.of': 'of',
    'ui.close': 'Close',
    'ui.readChapter': '📖 Read Chapter',
    'ui.another': '🎲 Another',
    'ui.tapToRead': '▼ Tap to read full story',
    'ui.tapToCollapse': '▲ Tap to collapse',
    'ui.noBookmarks': 'No bookmarks yet. Tap 📑 on any creature to save it here.',
    'ui.bookmarkTitle': '🔖 Your Bookmarks',
    'ui.randomTitle': '🎲 Random Creature',
    'ui.chapter': 'Chapter',
    'ui.creatures': 'creatures',
    'ui.extremeFact': '⚡ EXTREME FACT',
    'ui.language': 'Language',
    'ui.en': 'English',
    'ui.noFilterResults': 'All creatures filtered out. Try turning off the 💀 filter.',
    'ui.noResults': 'No creatures found matching',
    'ui.ru': 'Русский'
  };
  
  const val = EN[key];
  if (index !== undefined) {
    // For chapter titles
    if (key === 'chapters.title') return CHAPTERS[index]?.title || '';
    if (key === 'chapters.subtitle') return CHAPTERS[index]?.subtitle || '';
  }
  return val || key;
}

function getChapterTitle(i) {
  if (currentLang === 'ru' && typeof RUSSIAN !== 'undefined') {
    return RUSSIAN.chapters[i]?.title || CHAPTERS[i].title;
  }
  return CHAPTERS[i].title;
}

function getChapterSubtitle(i) {
  if (currentLang === 'ru' && typeof RUSSIAN !== 'undefined') {
    return RUSSIAN.chapters[i]?.subtitle || CHAPTERS[i].subtitle;
  }
  return CHAPTERS[i].subtitle;
}

function getCreatureData(c) {
  if (currentLang === 'ru' && typeof RUSSIAN !== 'undefined') {
    const ruCreature = RUSSIAN.creatures[c.id];
    if (ruCreature) {
      return {
        name: ruCreature.name,
        scientific: ruCreature.scientific,
        story: ruCreature.story,
        fact: ruCreature.fact
      };
    }
  }
  return {
    name: c.name,
    scientific: c.scientific,
    story: c.story,
    fact: c.fact
  };
}

function switchLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('wd_lang', lang);
  
  // Update UI text elements
  document.querySelector('.sidebar-header h1').textContent = t('ui.appTitle');
  document.querySelector('.sidebar-header .subtitle').textContent = t('ui.appSubtitle');
  document.getElementById('searchInput').placeholder = t('ui.searchPlaceholder');
  
  // Update install banner
  const installText = document.querySelector('.install-banner-text');
  if (installText) installText.textContent = t('ui.installText');
  const installBtn = document.getElementById('installBtn');
  if (installBtn) installBtn.textContent = t('ui.installBtn');
  
  // Update nav buttons
  document.querySelector('.sidebar-footer button:first-child').textContent = `🎲 ${t('ui.randomBtn').replace('🎲 ', '')}`;
  document.querySelector('.sidebar-footer button:last-child').textContent = `🔖 ${t('ui.bookmarksBtn').replace('🔖 ', '')}`;
  
  // Update swipe hint
  document.querySelector('.swipe-hint span:nth-child(2)').textContent = t('ui.swipeHint');
  
  // Update page nav buttons
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  prevBtn.innerHTML = `◀ ${t('ui.prevBtn').replace('◀ ', '')}`;
  nextBtn.innerHTML = `${t('ui.nextBtn').replace(' ▶', '')} ▶`;
  
  loadChapter(currentChapter);
  buildSidebar();
  buildBottomNav();
  document.getElementById('langBtn').textContent = lang === 'ru' ? '🇷🇺' : '🇬🇧';
}

// ================ INIT ================
document.addEventListener('DOMContentLoaded', () => {
  buildSidebar();
  buildBottomNav();
  loadChapter(0);
  setupSwipe();
  setupKeyboardNav();
  setupInstallPrompt();
  updateBookmarkUI();
  document.getElementById('langBtn').textContent = currentLang === 'ru' ? '🇷🇺' : '🇬🇧';
});

// ================ PWA INSTALL ================
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('installBanner').classList.add('show');
  document.getElementById('installBtn').onclick = async () => {
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      document.getElementById('installBanner').classList.remove('show');
    }
    deferredPrompt = null;
  };
});

window.addEventListener('appinstalled', () => {
  document.getElementById('installBanner').classList.remove('show');
});

function setupInstallPrompt() {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    document.getElementById('installBanner').classList.remove('show');
  }
}

// ================ LANGUAGE SWITCHER ================
function toggleLanguage() {
  switchLanguage(currentLang === 'en' ? 'ru' : 'en');
}

// ================ SIDEBAR ================
function buildSidebar() {
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = CHAPTERS.map((ch, i) => `
    <button class="chapter-btn ${i === 0 ? 'active' : ''}" onclick="loadChapter(${i})" data-chapter="${i}">
      <span class="ch-emoji">${ch.emoji}</span>
      <span class="ch-label">${getChapterTitle(i)}</span>
      <span class="ch-num">${ch.id + 1}</span>
    </button>
  `).join('');
}

function buildBottomNav() {
  const nav = document.getElementById('bottomNavInner');
  nav.innerHTML = CHAPTERS.map((ch, i) => `
    <button class="nav-item ${i === 0 ? 'active' : ''}" onclick="loadChapter(${i})" data-chapter="${i}">
      <span class="nav-emoji">${ch.emoji}</span>
      <span>${getChapterTitle(i).split(' ').slice(0, 2).join(' ')}</span>
    </button>
  `).join('');
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('mobile-open');
  overlay.classList.toggle('show');
}

document.getElementById('sidebarOverlay').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebarOverlay').classList.remove('show');
});

// ================ CHAPTER LOADING ================
function loadChapter(chapterIndex) {
  currentChapter = chapterIndex;
  // Close mobile sidebar if open
  const sidebar = document.getElementById('sidebar');
  if (sidebar.classList.contains('mobile-open')) {
    sidebar.classList.remove('mobile-open');
    document.getElementById('sidebarOverlay').classList.remove('show');
  }
  
  // Update active states
  document.querySelectorAll('.chapter-btn, .nav-item').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.chapter) === chapterIndex);
  });

  // Filter creatures by chapter
  currentCreatures = getFilteredCreatures(chapterIndex);
  buildPages(chapterIndex);
}

function getFilteredCreatures(chapterIndex) {
  let creatures = CREATURES.filter(c => c.chapter === chapterIndex);
  if (dangerFilterActive) {
    creatures = creatures.filter(c => c.danger >= 5);
  }
  if (isSearching) {
    const q = document.getElementById('searchInput').value.toLowerCase().trim();
    if (q) {
      creatures = creatures.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.scientific.toLowerCase().includes(q)
      );
    }
  }
  return creatures;
}

function handleSearch(query) {
  isSearching = query.trim().length > 0;
  if (isSearching) {
    currentCreatures = CREATURES.filter(c => {
      const match = c.name.toLowerCase().includes(query.toLowerCase()) || 
                    c.scientific.toLowerCase().includes(query.toLowerCase());
      if (dangerFilterActive) return match && c.danger >= 5;
      return match;
    });
    if (currentCreatures.length === 0) {
      document.getElementById('pagesContainer').innerHTML = `
        <div class="page">
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <div class="empty-text">${t('ui.noResults')} "${query}"</div>
          </div>
        </div>
      `;
      currentPage = 0;
      totalPages = 1;
      updatePageIndicator();
      updateReadingProgress();
      return;
    }
    buildSearchPages(currentCreatures);
  } else {
    loadChapter(currentChapter);
  }
}

function buildSearchPages(creatures) {
  const container = document.getElementById('pagesContainer');
  container.innerHTML = '';
  
  let pages = [];
  
  creatures.forEach(c => {
    const ch = CHAPTERS[c.chapter];
    pages.push(createCreaturePage(c, ch));
  });

  if (pages.length === 0) pages.push(createEmptyPage(t('ui.noFilterResults')));

  container.innerHTML = pages.join('');
  totalPages = pages.length;
  currentPage = 0;
  goToPage(0);
  updatePageIndicator();
  updateReadingProgress();
}

function toggleDangerFilter() {
  dangerFilterActive = !dangerFilterActive;
  const btn = document.getElementById('dangerFilterBtn');
  btn.classList.toggle('active-filter');
  btn.innerHTML = dangerFilterActive ? t('ui.filterActive') : t('ui.filterBtn');
  loadChapter(currentChapter);
}

// ================ BUILD PAGES ================
function buildPages(chapterIndex) {
  const container = document.getElementById('pagesContainer');
  container.innerHTML = '';

  const ch = CHAPTERS[chapterIndex];
  const creatures = currentCreatures;
  let pages = [];

  pages.push(createChapterIntroPage(ch, creatures.length));

  creatures.forEach(c => {
    pages.push(createCreaturePage(c, ch));
  });

  if (pages.length === 1) {
    pages.push(createEmptyPage(t('ui.noFilterResults')));
  }

  container.innerHTML = pages.join('');
  totalPages = pages.length;
  currentPage = 0;
  goToPage(0);
  updatePageIndicator();
  updateReadingProgress();
  updateTitle();
}

function createChapterIntroPage(ch, creatureCount) {
  const title = getChapterTitle(ch.id);
  const subtitle = getChapterSubtitle(ch.id);
  return `
    <div class="page page-enter">
      <div class="chapter-header">
        <div class="ch-hero-placeholder" id="chHero${ch.id}">${ch.emoji}</div>
        <h2>${title}</h2>
        <p>"${subtitle}"</p>
        <div class="chapter-stats">
          <span>📖 ${creatureCount} ${t('ui.creatures')}</span>
          <span>🏆 ${t('ui.chapter')} ${ch.id + 1} of 10</span>
        </div>
      </div>
    </div>
  `;
}

function createCreaturePage(c, ch) {
  const data = getCreatureData(c);
  const dangerEmojis = getDangerEmojis(c.danger);
  const isBookmarked = bookmarks.includes(c.id);
  const storyParagraphs = data.story.split('. ').join('.<br><br>');

  return `
    <div class="page page-enter">
      <div class="creature-card" onclick="toggleCardExpand(this, ${c.id})" data-id="${c.id}">
        <div class="card-header">
          <div class="card-info">
            <div class="card-name">${data.name}</div>
            <div class="card-scientific">${data.scientific}</div>
            <div class="card-danger">${dangerEmojis}</div>
          </div>
          <button class="card-bookmark ${isBookmarked ? 'bookmarked' : ''}" 
                  onclick="event.stopPropagation(); toggleBookmark(${c.id})" 
                  data-id="${c.id}">
            ${isBookmarked ? '🔖' : '📑'}
          </button>
        </div>
        <div class="card-preview">${data.story.substring(0, 150)}...</div>
        <div class="card-full-story">${storyParagraphs}</div>
        <div class="extreme-fact">
          <div class="extreme-fact-label">⚡ EXTREME FACT</div>
          <div class="extreme-fact-text">${data.fact}</div>
        </div>
        <div class="card-expand-hint">${t('ui.tapToRead')}</div>
      </div>
    </div>
  `;
}

function createEmptyPage(text) {
  return `
    <div class="page page-enter">
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">${text}</div>
      </div>
    </div>
  `;
}

// ================ CARD EXPAND ================
function toggleCardExpand(el, id) {
  el.classList.toggle('expanded');
  const hint = el.querySelector('.card-expand-hint');
  if (el.classList.contains('expanded')) {
    hint.textContent = t('ui.tapToCollapse');
  } else {
    hint.textContent = t('ui.tapToRead');
  }
}

// ================ DANGER RATING ================
function getDangerEmojis(level) {
  let emojis = '';
  for (let i = 0; i < 5; i++) {
    if (i < level) {
      emojis += `<span class="${level === 5 ? 'skull-high' : level >= 3 ? 'skull-med' : 'skull-low'}">💀</span>`;
    } else {
      emojis += `<span class="" style="opacity:0.2">💀</span>`;
    }
  }
  return emojis;
}

// ================ PAGE NAVIGATION ================
function goToPage(index) {
  if (index < 0 || index >= totalPages) return;
  currentPage = index;
  const container = document.getElementById('pagesContainer');
  container.style.transform = `translateX(-${index * 100}%)`;
  updatePageIndicator();
  updateReadingProgress();
  updateTitle();
}

function nextPage() {
  if (currentPage < totalPages - 1) {
    goToPage(currentPage + 1);
  }
}

function prevPage() {
  if (currentPage > 0) {
    goToPage(currentPage - 1);
  }
}

function updateTitle() {
  const creatures = currentCreatures;
  if (creatures.length > 0 && currentPage > 0 && currentPage <= creatures.length) {
    const c = creatures[currentPage - 1];
    const data = getCreatureData(c);
    if (data) document.getElementById('pageTitle').textContent = data.name;
    else document.getElementById('pageTitle').textContent = getChapterTitle(currentChapter);
  } else {
    document.getElementById('pageTitle').textContent = getChapterTitle(currentChapter);
  }
}

function updatePageIndicator() {
  document.getElementById('pageIndicator').textContent = `${t('ui.pageOf')} ${currentPage + 1} ${t('ui.of')} ${totalPages}`;
  document.getElementById('prevPageBtn').disabled = currentPage === 0;
  document.getElementById('nextPageBtn').disabled = currentPage >= totalPages - 1;
}

function updateReadingProgress() {
  const progress = totalPages > 1 ? (currentPage / (totalPages - 1)) * 100 : 0;
  document.getElementById('readingProgress').style.width = `${progress}%`;
}

// ================ SWIPE SUPPORT ================
function setupSwipe() {
  const area = document.getElementById('readingArea');
  
  area.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    dragStartX = touchStartX;
    isDragging = true;
    document.getElementById('pagesContainer').style.transition = 'none';
  }, { passive: true });

  area.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    touchEndX = e.changedTouches[0].screenX;
    dragOffset = touchEndX - dragStartX;
    
    const container = document.getElementById('pagesContainer');
    const baseTransform = -(currentPage * 100);
    const dragPercent = (dragOffset / area.offsetWidth) * 100;
    
    if ((currentPage === 0 && dragPercent > 0) || (currentPage >= totalPages - 1 && dragPercent < 0)) {
      container.style.transform = `translateX(${baseTransform + dragPercent * 0.2}%)`;
    } else {
      container.style.transform = `translateX(${baseTransform + dragPercent}%)`;
    }
  }, { passive: true });

  area.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    
    const container = document.getElementById('pagesContainer');
    container.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    
    const swipeDistance = touchEndX - touchStartX;
    const threshold = 50;
    
    if (Math.abs(swipeDistance) > threshold) {
      if (swipeDistance < 0) nextPage();
      else prevPage();
    } else {
      goToPage(currentPage);
    }
    
    touchStartX = 0;
    touchEndX = 0;
  }, { passive: true });

  // Mouse drag support for desktop
  let mouseDown = false;
  let mouseStartX = 0;
  const pagesContainer = document.getElementById('pagesContainer');

  area.addEventListener('mousedown', (e) => {
    mouseDown = true;
    mouseStartX = e.screenX;
    pagesContainer.style.transition = 'none';
  });

  area.addEventListener('mousemove', (e) => {
    if (!mouseDown) return;
    const offset = e.screenX - mouseStartX;
    const baseTransform = -(currentPage * 100);
    const dragPercent = (offset / area.offsetWidth) * 100;
    
    if ((currentPage === 0 && dragPercent > 0) || (currentPage >= totalPages - 1 && dragPercent < 0)) {
      pagesContainer.style.transform = `translateX(${baseTransform + dragPercent * 0.2}%)`;
    } else {
      pagesContainer.style.transform = `translateX(${baseTransform + dragPercent}%)`;
    }
  });

  area.addEventListener('mouseup', (e) => {
    if (!mouseDown) return;
    mouseDown = false;
    pagesContainer.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    
    const swipeDistance = e.screenX - mouseStartX;
    if (Math.abs(swipeDistance) > 50) {
      if (swipeDistance < 0) nextPage();
      else prevPage();
    } else {
      goToPage(currentPage);
    }
  });

  area.addEventListener('mouseleave', () => {
    if (mouseDown) {
      mouseDown = false;
      goToPage(currentPage);
    }
  });
}

// ================ KEYBOARD NAVIGATION ================
function setupKeyboardNav() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault();
      nextPage();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      prevPage();
    }
  });
}

// ================ BOOKMARKS ================
function toggleBookmark(id) {
  const index = bookmarks.indexOf(id);
  if (index > -1) {
    bookmarks.splice(index, 1);
  } else {
    bookmarks.push(id);
  }
  localStorage.setItem('wd_bookmarks', JSON.stringify(bookmarks));
  updateBookmarkUI();
}

function updateBookmarkUI() {
  document.querySelectorAll('.card-bookmark').forEach(btn => {
    const id = parseInt(btn.dataset.id);
    const isBookmarked = bookmarks.includes(id);
    btn.classList.toggle('bookmarked', isBookmarked);
    btn.textContent = isBookmarked ? '🔖' : '📑';
  });
}

function showBookmarks() {
  if (bookmarks.length === 0) {
    showModal(`
      <h3>${t('ui.bookmarkTitle')}</h3>
      <p style="color: var(--text-muted); font-size: 14px;">${t('ui.noBookmarks')}</p>
      <button class="modal-close" onclick="hideModal()">${t('ui.close')}</button>
    `);
    return;
  }

  let html = `<h3>${t('ui.bookmarkTitle')}</h3>`;
  bookmarks.forEach(id => {
    const c = CREATURES.find(cr => cr.id === id);
    if (c) {
      const ch = CHAPTERS[c.chapter];
      const data = getCreatureData(c);
      html += `
        <div class="bookmark-item" onclick="hideModal(); loadChapter(${c.chapter}); goToPage(${c.chapter === currentChapter ? currentCreatures.indexOf(c) : 0} + 1)">
          <span class="bm-name">${data.name}</span>
          <span class="bm-chapter">${ch.emoji} ${getChapterTitle(c.chapter)}</span>
          <button class="bm-remove" onclick="event.stopPropagation(); toggleBookmark(${id}); showBookmarks();">✕</button>
        </div>
      `;
    }
  });
  html += `<button class="modal-close" onclick="hideModal()">${t('ui.close')}</button>`;
  
  showModal(html);
}

// ================ RANDOM CREATURE ================
function showRandomCreature() {
  const c = CREATURES[Math.floor(Math.random() * CREATURES.length)];
  const ch = CHAPTERS[c.chapter];
  const data = getCreatureData(c);
  const dangerEmojis = getDangerEmojis(c.danger);
  
  showModal(`
    <h3>${t('ui.randomTitle')}</h3>
    <div class="random-creature">
      <div style="font-size: 40px; text-align: center; margin-bottom: 8px;">${ch.emoji}</div>
      <div class="rc-name">${data.name}</div>
      <div class="rc-sci">${data.scientific}</div>
      <div class="rc-danger">${dangerEmojis}</div>
      <div class="rc-story">${data.story.substring(0, 300)}...</div>
      <div class="extreme-fact" style="display: block; margin-top: 10px;">
        <div class="extreme-fact-label">${t('ui.extremeFact')}</div>
        <div class="extreme-fact-text">${data.fact}</div>
      </div>
    </div>
    <div style="display: flex; gap: 8px; margin-top: 12px;">
      <button class="modal-close" style="flex:1;" onclick="hideModal(); loadChapter(${c.chapter})">${t('ui.readChapter')}</button>
      <button class="modal-close" style="flex:1;" onclick="hideModal(); showRandomCreature()">${t('ui.another')}</button>
    </div>
  `);
}

// ================ MODAL ================
function showModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('show');
}

function hideModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}

document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) hideModal();
});

// ================ GEMINI IMAGES ================
async function loadGeminiImages() {
  for (let i = 0; i < CHAPTERS.length; i++) {
    const placeholder = document.getElementById(`chHero${i}`);
    if (placeholder) {
      const cached = localStorage.getItem(`wd_ch_img_${i}`);
      if (cached) {
        placeholder.innerHTML = `<img class="ch-hero" src="${cached}" alt="${CHAPTERS[i].title}" onerror="this.parentElement.innerHTML='${CHAPTERS[i].emoji}'">`;
        continue;
      }
      
      try {
        const imageData = await generateGeminiImage(CHAPTERS[i].geminiPrompt);
        if (imageData) {
          localStorage.setItem(`wd_ch_img_${i}`, imageData);
          placeholder.innerHTML = `<img class="ch-hero" src="${imageData}" alt="${CHAPTERS[i].title}" onerror="this.parentElement.innerHTML='${CHAPTERS[i].emoji}'">`;
        }
      } catch (e) {
        console.log('Gemini image generation failed, using placeholder:', e);
      }
    }
  }
}

async function generateGeminiImage(prompt) {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ 
            text: `Generate a dramatic, photorealistic wildlife photograph in National Geographic style with the following theme: ${prompt}. Please return ONLY a valid base64 encoded JPEG image (no markdown, no text, just the base64 string starting with "data:image/jpeg;base64,").`
          }]
        }],
        generationConfig: {
          temperature: 1,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
        }
      })
    });
    
    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const parts = data.candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        if (part.text) {
          const match = part.text.match(/!\[.*?\]\((.*?)\)/);
          if (match) return match[1];
          const base64Match = part.text.match(/data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+/);
          if (base64Match) return base64Match[0];
        }
      }
    }
    return null;
  } catch (e) {
    console.error('Gemini API error:', e);
    return null;
  }
}

setTimeout(loadGeminiImages, 1000);

// ================ SERVICE WORKER ================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.log('SW registration failed:', err);
    });
  });
}

// ================ RESPONSIVE ================
window.addEventListener('resize', () => {
  isMobile = window.innerWidth <= 900;
});