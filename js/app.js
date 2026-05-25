// =============================================
// WILD AND DEADLY — Complete & Corrected
// =============================================

let currentPage = 0;
let totalPages = 0;
let currentChapter = 0;
let currentCreatures = [];
let bookmarks = JSON.parse(localStorage.getItem('wd_bookmarks') || '[]');
let dangerFilterActive = false;
let currentLang = localStorage.getItem('wd_lang') || 'en';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI
  loadChapter(0);
  
  // Event Listeners
  document.getElementById('langBtn')?.addEventListener('click', toggleLanguage);
  document.getElementById('randomBtn')?.addEventListener('click', showRandomCreature);
  document.getElementById('bookmarkBtn')?.addEventListener('click', showBookmarks);
  document.getElementById('filterDangerBtn')?.addEventListener('click', toggleDangerFilter);
  document.getElementById('prevPageBtn')?.addEventListener('click', prevPage);
  document.getElementById('nextPageBtn')?.addEventListener('click', nextPage);
});

// Navigation Logic
function goToPage(index) {
  currentPage = index;
  const container = document.getElementById('pagesContainer');
  if (container) container.style.transform = `translateX(-${index * 100}%)`;
  updateNav();
}

function prevPage() { if (currentPage > 0) goToPage(currentPage - 1); }
function nextPage() { if (currentPage < totalPages - 1) goToPage(currentPage + 1); }

function updateNav() {
  const ind = document.getElementById('pageIndicator');
  if (ind) ind.textContent = `Page ${currentPage + 1} of ${totalPages}`;
  document.getElementById('prevPageBtn').disabled = (currentPage === 0);
  document.getElementById('nextPageBtn').disabled = (currentPage === totalPages - 1);
}

// Data Rendering
function loadChapter(chapterIndex) {
  currentChapter = chapterIndex;
  currentCreatures = CREATURES.filter(c => c.chapter === chapterIndex);
  renderCreatures(currentCreatures);
}

function renderCreatures(creatureList) {
  const container = document.getElementById('pagesContainer');
  if (!container) return;

  currentCreatures = creatureList;
  totalPages = currentCreatures.length;
  currentPage = 0;

  container.innerHTML = currentCreatures.map(c => {
    const data = getCreatureData(c);
    const img = `https://commons.wikimedia.org/wiki/Special:FilePath/${data.name.replace(/\s+/g, '_')}.jpg?width=600`;
    return `
      <div class="page" style="min-width: 100%; box-sizing: border-box; padding: 20px;">
        <div class="creature-card">
          <img src="${img}" onerror="this.style.display='none'" style="width: 100%; border-radius: 8px;">
          <h2>${data.name}</h2>
          <p>${data.story.replace(/\./g, '.<br><br>')}</p>
        </div>
      </div>
    `;
  }).join('');
  
  goToPage(0);
}

// Features
function toggleLanguage() {
  currentLang = (currentLang === 'en' ? 'ru' : 'en');
  localStorage.setItem('wd_lang', currentLang);
  loadChapter(currentChapter);
}

function toggleDangerFilter() {
  dangerFilterActive = !dangerFilterActive;
  const filtered = dangerFilterActive ? CREATURES.filter(c => c.danger >= 5) : CREATURES.filter(c => c.chapter === currentChapter);
  renderCreatures(filtered);
}

function showRandomCreature() {
  const random = CREATURES[Math.floor(Math.random() * CREATURES.length)];
  renderCreatures([random]);
}

function showBookmarks() {
  const bookmarked = CREATURES.filter(c => bookmarks.includes(c.id));
  renderCreatures(bookmarked);
}
