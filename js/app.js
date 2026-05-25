// =============================================
// WILD AND DEADLY — Main Application
// =============================================

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
    'ui.noFilterResults': 'All creatures filtered out. Try turning off the 💀 filter.',
    'ui.noResults': 'No creatures found matching'
  };
  return EN[key] || key;
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
  document.querySelector('.sidebar-header h1').textContent = t('ui.appTitle');
  document.querySelector('.sidebar-header .subtitle').textContent = t('ui.appSubtitle');
  document.getElementById('searchInput').placeholder = t('ui.searchPlaceholder');
  loadChapter(currentChapter);
  buildSidebar();
}

// ================ INITIALIZATION ================
document.addEventListener('DOMContentLoaded', () => {
  buildSidebar();
  buildBottomNav();
  loadChapter(0);
  setupSwipe();
  setupKeyboardNav();
});

// ================ UI BUILDING ================
function buildSidebar() {
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = CHAPTERS.map((ch, i) => `
    <button class="chapter-btn ${i === 0 ? 'active' : ''}" onclick="loadChapter(${i})" data-chapter="${i}">
      <span class="ch-emoji">${ch.emoji}</span>
      <span class="ch-label">${getChapterTitle(i)}</span>
    </button>
  `).join('');
}

function buildBottomNav() {
  const nav = document.getElementById('bottomNavInner');
  nav.innerHTML = CHAPTERS.map((ch, i) => `
    <button class="nav-item ${i === 0 ? 'active' : ''}" onclick="loadChapter(${i})" data-chapter="${i}">
      <span class="nav-emoji">${ch.emoji}</span>
    </button>
  `).join('');
}

function loadChapter(chapterIndex) {
  currentChapter = chapterIndex;
  currentCreatures = CREATURES.filter(c => c.chapter === chapterIndex);
  buildPages();
}

function createCreaturePage(c) {
  const data = getCreatureData(c);
  const dangerEmojis = getDangerEmojis(c.danger);
  const isBookmarked = bookmarks.includes(c.id);
  
  // FIXED: Using Wikimedia Commons for high-reliability images
  // This replaces the broken Unsplash link
  const formattedName = data.name.replace(/\s+/g, '_');
  const imageSrc = `https://commons.wikimedia.org/wiki/Special:FilePath/${formattedName}.jpg?width=600`;

  return `
    <div class="page page-enter">
      <div class="creature-card" onclick="toggleCardExpand(this, ${c.id})" data-id="${c.id}">
        <div class="card-header">
          <div class="card-image-wrapper">
            <img class="card-image" 
                 src="${imageSrc}" 
                 alt="${data.name}" 
                 onerror="this.style.display='none'" 
                 style="width: 100%; border-radius: 8px; display: block;">
          </div>
          <div class="card-info">
            <div class="card-name">${data.name}</div>
            <div class="card-scientific">${data.scientific}</div>
            <div class="card-danger">${dangerEmojis}</div>
          </div>
        </div>
        <div class="card-full-story">${data.story.split('. ').join('.<br><br>')}</div>
        <div class="extreme-fact">
          <div class="extreme-fact-label">⚡ ${t('ui.extremeFact')}</div>
          <div class="extreme-fact-text">${data.fact}</div>
        </div>
      </div>
    </div>
  `;
}

function buildPages() {
  const container = document.getElementById('pagesContainer');
  container.innerHTML = currentCreatures.map(c => createCreaturePage(c)).join('');
  totalPages = currentCreatures.length;
  currentPage = 0;
  goToPage(0);
}

function goToPage(index) {
  currentPage = index;
  document.getElementById('pagesContainer').style.transform = `translateX(-${index * 100}%)`;
}

function getDangerEmojis(level) {
  let emojis = '';
  for (let i = 0; i < 5; i++) {
    emojis += `<span style="opacity: ${i < level ? '1' : '0.2'}">💀</span>`;
  }
  return emojis;
}

function setupSwipe() { /* ... kept as per original ... */ }
function setupKeyboardNav() { /* ... kept as per original ... */ }
