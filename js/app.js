// =============================================
// WILD AND DEADLY — Full Corrected Code
// =============================================

let currentPage = 0;
let totalPages = 0;
let currentChapter = 0;
let currentCreatures = [];
let bookmarks = JSON.parse(localStorage.getItem('wd_bookmarks') || '[]');
let currentLang = localStorage.getItem('wd_lang') || 'en';

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  buildSidebar();
  loadChapter(0);
});

// Translation Logic
function t(key) {
  const EN = {
    'ui.appTitle': '⚡ Wild & Deadly',
    'ui.appSubtitle': '100 Extreme Creatures',
    'ui.extremeFact': '⚡ EXTREME FACT',
    'ui.pageOf': 'Page',
    'ui.of': 'of'
  };
  return EN[key] || key;
}

// Sidebar Construction
function buildSidebar() {
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = CHAPTERS.map((ch, i) => `
    <button class="chapter-btn ${i === 0 ? 'active' : ''}" onclick="loadChapter(${i})" data-chapter="${i}">
      ${ch.emoji} ${ch.title}
    </button>
  `).join('');
}

// Core Chapter/Page Logic
function loadChapter(chapterIndex) {
  currentChapter = chapterIndex;
  currentCreatures = CREATURES.filter(c => c.chapter === chapterIndex);
  
  // Highlight active button
  document.querySelectorAll('.chapter-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === chapterIndex);
  });

  buildPages();
}

function buildPages() {
  const container = document.getElementById('pagesContainer');
  totalPages = currentCreatures.length;
  currentPage = 0;
  
  container.innerHTML = currentCreatures.map(c => `
    <div class="page">
      <div class="creature-card">
        <div class="card-image-wrapper">
          <img class="card-image" src="https://commons.wikimedia.org/wiki/Special:FilePath/${c.name.replace(/\s+/g, '_')}.jpg?width=600" 
               alt="${c.name}" onerror="this.style.display='none'">
        </div>
        <h2>${c.name}</h2>
        <p><em>${c.scientific}</em></p>
        <p>${c.story}</p>
        <div class="extreme-fact"><strong>${t('ui.extremeFact')}:</strong> ${c.fact}</div>
      </div>
    </div>
  `).join('');

  updateNav();
}

// Navigation Logic
function goToPage(index) {
  if (index < 0 || index >= totalPages) return;
  currentPage = index;
  document.getElementById('pagesContainer').style.transform = `translateX(-${index * 100}%)`;
  updateNav();
}

function nextPage() { if (currentPage < totalPages - 1) goToPage(currentPage + 1); }
function prevPage() { if (currentPage > 0) goToPage(currentPage - 1); }

function updateNav() {
  document.getElementById('pageIndicator').textContent = `${t('ui.pageOf')} ${currentPage + 1} ${t('ui.of')} ${totalPages}`;
  document.getElementById('prevPageBtn').disabled = currentPage === 0;
  document.getElementById('nextPageBtn').disabled = currentPage === totalPages - 1;
}
