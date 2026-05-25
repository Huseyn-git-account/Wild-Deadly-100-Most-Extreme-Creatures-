// =============================================
// WILD AND DEADLY — Full Corrected Engine
// =============================================

// Ensure buttons are attached when page loads
document.addEventListener('DOMContentLoaded', () => {
  buildSidebar();
  loadChapter(0);
  
  // Attach Event Listeners to UI Buttons
  document.getElementById('langBtn')?.addEventListener('click', toggleLanguage);
  document.getElementById('randomBtn')?.addEventListener('click', showRandomCreature);
  document.getElementById('bookmarkBtn')?.addEventListener('click', showBookmarks);
  document.getElementById('filterDangerBtn')?.addEventListener('click', toggleDangerFilter);
  document.getElementById('prevPageBtn')?.addEventListener('click', prevPage);
  document.getElementById('nextPageBtn')?.addEventListener('click', nextPage);
});

// Navigation Logic
function prevPage() { if (currentPage > 0) goToPage(currentPage - 1); }
function nextPage() { if (currentPage < totalPages - 1) goToPage(currentPage + 1); }

function goToPage(index) {
  currentPage = index;
  const container = document.getElementById('pagesContainer');
  if (container) {
    container.style.transform = `translateX(-${index * 100}%)`;
  }
  updateNav();
}

// Chapter/Page Rendering
function loadChapter(chapterIndex) {
  currentChapter = chapterIndex;
  currentCreatures = CREATURES.filter(c => c.chapter === chapterIndex);
  
  const container = document.getElementById('pagesContainer');
  if (!container) return;

  container.innerHTML = currentCreatures.map(c => {
    const data = getCreatureData(c);
    const formattedName = data.name.replace(/\s+/g, '_');
    const imageSrc = `https://commons.wikimedia.org/wiki/Special:FilePath/${formattedName}.jpg?width=600`;

    return `
      <div class="page">
        <div class="creature-card">
          <img class="card-image" src="${imageSrc}" alt="${data.name}" onerror="this.style.display='none'">
          <h2>${data.name}</h2>
          <p><em>${data.scientific}</em></p>
          <p>${data.story.split('. ').join('.<br><br>')}</p>
          <div class="extreme-fact">⚡ ${t('ui.extremeFact')}: ${data.fact}</div>
        </div>
      </div>
    `;
  }).join('');

  totalPages = currentCreatures.length;
  goToPage(0);
}

// Button Features
function toggleLanguage() {
  currentLang = (currentLang === 'en' ? 'ru' : 'en');
  localStorage.setItem('wd_lang', currentLang);
  loadChapter(currentChapter);
}

function toggleDangerFilter() {
  dangerFilterActive = !dangerFilterActive;
  document.getElementById('filterDangerBtn').classList.toggle('active', dangerFilterActive);
  loadChapter(currentChapter);
}

function showRandomCreature() {
  const random = CREATURES[Math.floor(Math.random() * CREATURES.length)];
  loadChapter(random.chapter);
  setTimeout(() => {
    const idx = currentCreatures.findIndex(c => c.id === random.id);
    goToPage(idx);
  }, 100);
}

function showBookmarks() {
  currentCreatures = CREATURES.filter(c => bookmarks.includes(c.id));
  loadChapter(currentChapter);
}

function updateNav() {
  document.getElementById('pageIndicator').textContent = `${t('ui.pageOf')} ${currentPage + 1} ${t('ui.of')} ${totalPages}`;
  document.getElementById('prevPageBtn').disabled = (currentPage === 0);
  document.getElementById('nextPageBtn').disabled = (currentPage === totalPages - 1);
}
