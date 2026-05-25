// =============================================
// WILD AND DEADLY — Main Application (Optimized)
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

// ================ FAST AUTOMATED IMAGE ENGINE ================
function getCreatureImage(englishName) {
  // Always uses the strict English database name to ensure Unsplash never breaks
  const query = encodeURIComponent(englishName.trim().toLowerCase() + " animal wildlife");
  return `https://images.unsplash.com/featured/600x400/?${query}`;
}

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
    return obj;
  }
  return getEnglishFallback(key, index);
}

function getEnglishFallback(key, index) {
  if (key.startsWith('ui.')) {
    const k = key.split('.')[1];
    const fallbacks = {
      appTitle: "⚡ Wild & Deadly",
      appSubtitle: "100 Most Extreme Creatures",
      searchPlaceholder: "Search creatures...",
      filterBtn: "💀 Filter",
      filterActive: "💀🔴",
      randomBtn: "🎲 Random",
      bookmarksBtn: "🔖 Bookmarks",
      installText: "📲 Install Wild & Deadly for offline reading",
      installBtn: "Install",
      prevBtn: "◀ Back",
      nextBtn: "Next ▶",
      swipeHint: "Swipe or click arrows to turn pages",
      pageOf: "Page",
      of: "of",
      close: "Close",
      readChapter: "📖 Read Chapter",
      another: "🎲 Another",
      tapToRead: "▼ Tap to read story",
      tapToCollapse: "▲ Tap to collapse",
      noBookmarks: "No bookmarks yet. Tap 📑 on any creature to save it here.",
      noResults: "No creatures found matching your search.",
      noFilterResults: "All creatures filtered out. Try turning off the 💀 filter.",
      bookmarkTitle: "🔖 Your Bookmarks",
      randomTitle: "🎲 Random Creature",
      chapter: "Chapter",
      creatures: "creatures",
      extremeFact: "⚡ EXTREME FACT"
    };
    return fallbacks[k] || key;
  }
  return key;
}

// ================ CORE APP INITIALIZATION ================
function initApp() {
  setupLanguageToggle();
  loadChapter(0);
  renderSidebar();
  setupEventListeners();
  updateUIStrings();
}

function updateUIStrings() {
  document.querySelector('.sidebar-header h1').innerHTML = t('ui.appTitle');
  document.querySelector('.sidebar-header .subtitle').innerHTML = t('ui.appSubtitle');
  document.getElementById('searchInput').placeholder = t('ui.searchPlaceholder');
  document.getElementById('prevPageBtn').innerHTML = `◀ <span class="btn-text">${t('ui.prevBtn').replace('◀ ', '')}</span>`;
  document.getElementById('nextPageBtn').innerHTML = `<span class="btn-text">${t('ui.nextBtn').replace(' ▶', '')}</span> ▶`;
  
  const filterBtn = document.getElementById('filterDangerBtn');
  filterBtn.innerHTML = dangerFilterActive ? t('ui.filterActive') : t('ui.filterBtn');
}

function setupLanguageToggle() {
  const btnEn = document.getElementById('langEn');
  const btnRu = document.getElementById('langRu');
  
  if(currentLang === 'ru') {
    btnRu.classList.add('active');
    btnEn.classList.remove('active');
  } else {
    btnEn.classList.add('active');
    btnRu.classList.remove('active');
  }

  btnEn.onclick = () => switchLanguage('en');
  btnRu.onclick = () => switchLanguage('ru');
}

function switchLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('wd_lang', lang);
  setupLanguageToggle();
  updateUIStrings();
  renderSidebar();
  if (isSearching) {
    handleSearch(document.getElementById('searchInput').value);
  } else {
    loadChapter(currentChapter);
  }
}

function loadChapter(chapterId) {
  currentChapter = chapterId;
  isSearching = false;
  document.getElementById('searchInput').value = '';
  
  let creatures = [];
  if (typeof ALL_CREATURES !== 'undefined') {
    creatures = ALL_CREATURES.filter(c => c.chapter === chapterId);
  }
  
  if (dangerFilterActive) {
    creatures = creatures.filter(c => c.danger === 5);
  }
  
  currentCreatures = creatures;
  currentPage = 0;
  totalPages = creatures.length;
  
  renderPages();
  updatePageControls();
  highlightSidebar(chapterId);
}

function renderPages() {
  const container = document.getElementById('pagesContainer');
  container.innerHTML = '';
  
  if (currentCreatures.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>${dangerFilterActive ? t('ui.noFilterResults') : t('ui.noResults')}</p>
      </div>
    `;
    return;
  }
  
  currentCreatures.forEach((creature, index) => {
    const page = document.createElement('div');
    page.className = 'book-page';
    if (index === currentPage) page.classList.add('active');
    
    // CRITICAL FIX: Always passes creature.name (English string) into the engine, regardless of localization
    const imageUrl = getCreatureImage(creature.name);
    
    let displayName = creature.name;
    let displayStory = creature.story;
    let displayFact = creature.fact;
    
    if (currentLang === 'ru' && typeof RUSSIAN !== 'undefined' && RUSSIAN.creatures && RUSSIAN.creatures[creature.id]) {
      const ruData = RUSSIAN.creatures[creature.id];
      displayName = ruData.name || displayName;
      displayStory = ruData.story || displayStory;
      displayFact = ruData.fact || displayFact;
    }

    let skulls = '';
    for(let i=0; i<5; i++) {
      skulls += i < creature.danger ? '💀' : '⚫';
    }

    const isBookmarked = bookmarks.includes(creature.id);

    page.innerHTML = `
      <div class="card">
        <div class="card-image-wrapper">
          <img class="card-image" src="${imageUrl}" alt="${displayName}" loading="lazy">
          <div class="card-badge-container">
            <span class="danger-badge">${skulls}</span>
            <button class="bookmark-btn ${isBookmarked ? 'active' : ''}" onclick="toggleBookmark(${creature.id}, event)">
              ${isBookmarked ? '🔖' : '📑'}
            </button>
          </div>
        </div>
        <div class="card-content">
          <h2 class="card-title">${displayName}</h2>
          <div class="card-scientific">${creature.scientific}</div>
          <p class="card-story">${displayStory}</p>
          <div class="card-fact-box">
            <strong>${t('ui.extremeFact')}:</strong> ${displayFact}
          </div>
        </div>
      </div>
    `;
    container.appendChild(page);
  });
  
  positionPages();
}

function positionPages() {
  const pages = document.querySelectorAll('.book-page');
  pages.forEach((page, index) => {
    page.style.transform = `translateX(${(index - currentPage) * 100}%)`;
  });
}

function updatePageControls() {
  const indicator = document.getElementById('pageIndicator');
  if (totalPages === 0) {
    indicator.innerHTML = `${t('ui.pageOf')} 0 ${t('ui.of')} 0`;
    return;
  }
  indicator.innerHTML = `${t('ui.pageOf')} ${currentPage + 1} ${t('ui.of')} ${totalPages}`;
  
  document.getElementById('prevPageBtn').style.opacity = currentPage === 0 ? '0.3' : '1';
  document.getElementById('nextPageBtn').style.opacity = currentPage === totalPages - 1 ? '0.3' : '1';
  
  const progressBar = document.getElementById('readingProgress');
  const percentage = totalPages > 1 ? (currentPage / (totalPages - 1)) * 100 : 100;
  progressBar.style.width = `${percentage}%`;
}

function nextPage() {
  if (currentPage < totalPages - 1) {
    currentPage++;
    renderPages();
    updatePageControls();
  }
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    renderPages();
    updatePageControls();
  }
}

function toggleBookmark(id, event) {
  event.stopPropagation();
  const index = bookmarks.indexOf(id);
  if (index > -1) {
    bookmarks.splice(index, 1);
  } else {
    bookmarks.push(id);
  }
  localStorage.setItem('wd_bookmarks', JSON.stringify(bookmarks));
  renderPages();
}

function toggleDangerFilter() {
  dangerFilterActive = !dangerFilterActive;
  updateUIStrings();
  if (isSearching) {
    handleSearch(document.getElementById('searchInput').value);
  } else {
    loadChapter(currentChapter);
  }
}

function handleSearch(query) {
  if (!query.trim()) {
    loadChapter(currentChapter);
    return;
  }
  isSearching = true;
  let matches = [];
  
  if (typeof ALL_CREATURES !== 'undefined') {
    matches = ALL_CREATURES.filter(c => {
      let nameMatch = c.name.toLowerCase().includes(query.toLowerCase());
      let scientificMatch = c.scientific.toLowerCase().includes(query.toLowerCase());
      
      if (currentLang === 'ru' && typeof RUSSIAN !== 'undefined' && RUSSIAN.creatures && RUSSIAN.creatures[c.id]) {
        const ruData = RUSSIAN.creatures[c.id];
        if (ruData.name) nameMatch = nameMatch || ruData.name.toLowerCase().includes(query.toLowerCase());
      }
      return nameMatch || scientificMatch;
    });
  }

  if (dangerFilterActive) {
    matches = matches.filter(c => c.danger === 5);
  }

  currentCreatures = matches;
  currentPage = 0;
  totalPages = matches.length;
  renderPages();
  updatePageControls();
}

function showRandomCreature() {
  if (typeof ALL_CREATURES === 'undefined' || ALL_CREATURES.length === 0) return;
  const randomIndex = Math.floor(Math.random() * ALL_CREATURES.length);
  const creature = ALL_CREATURES[randomIndex];
  
  dangerFilterActive = false;
  updateUIStrings();
  
  currentChapter = creature.chapter;
  let chapterCreatures = ALL_CREATURES.filter(c => c.chapter === currentChapter);
  currentCreatures = chapterCreatures;
  totalPages = chapterCreatures.length;
  currentPage = chapterCreatures.findIndex(c => c.id === creature.id);
  
  renderPages();
  updatePageControls();
  highlightSidebar(currentChapter);
}

function showBookmarks() {
  if (bookmarks.length === 0) {
    const container = document.getElementById('pagesContainer');
    container.innerHTML = `
      <div class="empty-state">
        <p>${t('ui.noBookmarks')}</p>
      </div>
    `;
    totalPages = 0;
    updatePageControls();
    return;
  }
  
  isSearching = true;
  let matches = ALL_CREATURES.filter(c => bookmarks.includes(c.id));
  currentCreatures = matches;
  currentPage = 0;
  totalPages = matches.length;
  renderPages();
  updatePageControls();
}

function renderSidebar() {
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = '';
  
  if (typeof CHAPTERS === 'undefined') return;
  
  CHAPTERS.forEach(ch => {
    const item = document.createElement('div');
    item.className = 'sidebar-item';
    item.id = `sidebar-ch-${ch.id}`;
    
    let title = ch.title;
    if (currentLang === 'ru' && typeof RUSSIAN !== 'undefined' && RUSSIAN.chapters && RUSSIAN.chapters[ch.id]) {
      title = RUSSIAN.chapters[ch.id].title || title;
    }

    item.innerHTML = `<span>${ch.emoji} ${title}</span>`;
    item.onclick = () => loadChapter(ch.id);
    nav.appendChild(item);
  });
}

function highlightSidebar(chapterId) {
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  const activeItem = document.getElementById(`sidebar-ch-${chapterId}`);
  if (activeItem) activeItem.classList.add('active');
}

function setupEventListeners() {
  document.getElementById('searchInput').oninput = (e) => handleSearch(e.target.value);
  document.getElementById('filterDangerBtn').onclick = toggleDangerFilter;
  
  // Swipe mechanics
  const area = document.getElementById('readingArea');
  area.ontouchstart = (e) => {
    touchStartX = e.touches[0].clientX;
  };
  area.ontouchend = (e) => {
    touchEndX = e.touches[0].clientX;
    handleSwipe();
  };
}

function handleSwipe() {
  const threshold = 50;
  if (touchStartX - touchEndX > threshold) {
    nextPage();
  } else if (touchEndX - touchStartX > threshold) {
    prevPage();
  }
}

window.onload = initApp;
