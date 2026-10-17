import { CATEGORIES, INITIAL_SCRIPTS } from './data/scriptsData.js';

// Application State
let scripts = [...INITIAL_SCRIPTS];
let activeCategory = 'all';
let searchQuery = '';
let activeModalScript = null;

// DOM Elements
const categoriesListEl = document.getElementById('categories-list');
const scriptsGridEl = document.getElementById('scripts-grid');
const searchInputEl = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const statsTextEl = document.getElementById('stats-text');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const emptyStateEl = document.getElementById('empty-state');
const emptyResetBtn = document.getElementById('empty-reset-btn');
const toastEl = document.getElementById('toast');

// Modal Elements - View Script
const scriptModalEl = document.getElementById('script-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCategoryEl = document.getElementById('modal-category');
const modalTitleEl = document.getElementById('modal-title');
const modalSituationEl = document.getElementById('modal-situation');
const modalScriptTextEl = document.getElementById('modal-script-text');
const modalTipsListEl = document.getElementById('modal-tips-list');
const modalTagsEl = document.getElementById('modal-tags');
const modalCopyBtn = document.getElementById('modal-copy-btn');

// Modal Elements - Add Script
const addScriptBtn = document.getElementById('add-script-btn');
const addModalEl = document.getElementById('add-modal');
const addModalCloseBtn = document.getElementById('add-modal-close-btn');
const addFormCancelBtn = document.getElementById('add-form-cancel-btn');
const addScriptForm = document.getElementById('add-script-form');

// Initialize App
function init() {
  renderCategories();
  renderScripts();
  setupEventListeners();
}

// Render Categories
function renderCategories() {
  categoriesListEl.innerHTML = CATEGORIES.map(cat => `
    <button
      class="category-chip ${cat.id === activeCategory ? 'active' : ''}"
      data-category-id="${cat.id}"
    >
      <span>${cat.icon}</span>
      <span>${cat.name}</span>
    </button>
  `).join('');
}

// Filter Scripts
function getFilteredScripts() {
  return scripts.filter(script => {
    const matchesCategory = activeCategory === 'all' || script.category === activeCategory;

    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchesCategory;

    const matchesTitle = script.title.toLowerCase().includes(query);
    const matchesSituation = script.situation.toLowerCase().includes(query);
    const matchesScript = script.scriptText.toLowerCase().includes(query);
    const matchesTags = script.tags ? script.tags.some(tag => tag.toLowerCase().includes(query)) : false;

    return matchesCategory && (matchesTitle || matchesSituation || matchesScript || matchesTags);
  });
}

// Render Scripts Grid
function renderScripts() {
  const filtered = getFilteredScripts();

  // Update stats text
  const totalCount = scripts.length;
  statsTextEl.textContent = `Показано ${filtered.length} из ${totalCount} ситуаций`;

  if (activeCategory !== 'all' || searchQuery.trim() !== '') {
    resetFiltersBtn.classList.remove('hidden');
  } else {
    resetFiltersBtn.classList.add('hidden');
  }

  if (filtered.length === 0) {
    scriptsGridEl.innerHTML = '';
    emptyStateEl.classList.remove('hidden');
    return;
  }

  emptyStateEl.classList.add('hidden');

  scriptsGridEl.innerHTML = filtered.map(script => {
    const categoryObj = CATEGORIES.find(c => c.id === script.category) || { name: 'Общее', icon: '📝' };
    const tagsHtml = (script.tags || []).slice(0, 3).map(tag => `<span class="tag">#${tag}</span>`).join('');

    return `
      <div class="script-card" data-script-id="${script.id}">
        <div class="card-top">
          <span class="badge">${categoryObj.icon} ${categoryObj.name}</span>
          <h3 class="card-title">${escapeHtml(script.title)}</h3>
          <p class="card-description">${escapeHtml(script.description || script.situation)}</p>
          <div class="card-snippet">"${escapeHtml(script.scriptText.slice(0, 110))}..."</div>
        </div>
        <div class="card-footer">
          <div class="tags-wrapper">${tagsHtml}</div>
          <span class="btn-card-action">Открыть ➔</span>
        </div>
      </div>
    `;
  }).join('');
}

// Open Detail Modal
function openScriptModal(scriptId) {
  const script = scripts.find(s => s.id === scriptId);
  if (!script) return;

  activeModalScript = script;
  const categoryObj = CATEGORIES.find(c => c.id === script.category) || { name: 'Общее' };

  modalCategoryEl.textContent = categoryObj.name;
  modalTitleEl.textContent = script.title;
  modalSituationEl.textContent = script.situation;
  modalScriptTextEl.textContent = script.scriptText;

  // Render tips
  if (script.tips && script.tips.length > 0) {
    modalTipsListEl.innerHTML = script.tips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('');
    document.getElementById('modal-tips-section').classList.remove('hidden');
  } else {
    document.getElementById('modal-tips-section').classList.add('hidden');
  }

  // Render tags
  if (script.tags && script.tags.length > 0) {
    modalTagsEl.innerHTML = script.tags.map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join('');
  } else {
    modalTagsEl.innerHTML = '';
  }

  scriptModalEl.classList.remove('hidden');
}

// Close Modal
function closeModals() {
  scriptModalEl.classList.add('hidden');
  addModalEl.classList.add('hidden');
  activeModalScript = null;
}

// Copy Text to Clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Текст скопирован в буфер обмена!');
  } catch (err) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Текст скопирован!');
  }
}

// Show Toast
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 2500);
}

// Setup Event Listeners
function setupEventListeners() {
  // Category click
  categoriesListEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.category-chip');
    if (!chip) return;

    activeCategory = chip.dataset.categoryId;
    renderCategories();
    renderScripts();
  });

  // Search input
  searchInputEl.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (searchQuery.length > 0) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }
    renderScripts();
  });

  // Clear search
  clearSearchBtn.addEventListener('click', () => {
    searchQuery = '';
    searchInputEl.value = '';
    clearSearchBtn.classList.add('hidden');
    renderScripts();
  });

  // Reset filters
  const resetFilters = () => {
    activeCategory = 'all';
    searchQuery = '';
    searchInputEl.value = '';
    clearSearchBtn.classList.add('hidden');
    renderCategories();
    renderScripts();
  };

  resetFiltersBtn.addEventListener('click', resetFilters);
  emptyResetBtn.addEventListener('click', resetFilters);

  // Script card click
  scriptsGridEl.addEventListener('click', (e) => {
    const card = e.target.closest('.script-card');
    if (!card) return;
    openScriptModal(card.dataset.scriptId);
  });

  // Close modals
  modalCloseBtn.addEventListener('click', closeModals);
  addModalCloseBtn.addEventListener('click', closeModals);
  addFormCancelBtn.addEventListener('click', closeModals);

  // Close modal on background click
  window.addEventListener('click', (e) => {
    if (e.target === scriptModalEl || e.target === addModalEl) {
      closeModals();
    }
  });

  // Copy button in modal
  modalCopyBtn.addEventListener('click', () => {
    if (activeModalScript) {
      copyToClipboard(activeModalScript.scriptText);
    }
  });

  // Open add script modal
  addScriptBtn.addEventListener('click', () => {
    addModalEl.classList.remove('hidden');
  });

  // Submit new script form
  addScriptForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const category = document.getElementById('form-category').value;
    const title = document.getElementById('form-title').value.trim();
    const situation = document.getElementById('form-situation').value.trim();
    const scriptText = document.getElementById('form-script').value.trim();
    const tipsRaw = document.getElementById('form-tips').value.trim();
    const tagsRaw = document.getElementById('form-tags').value.trim();

    const tips = tipsRaw ? tipsRaw.split('\n').filter(t => t.trim() !== '') : [];
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(t => t !== '') : [];

    const newScript = {
      id: `script-${Date.now()}`,
      category,
      title,
      description: situation.slice(0, 100) + '...',
      situation,
      scriptText,
      tips,
      tags
    };

    scripts.unshift(newScript);
    addScriptForm.reset();
    closeModals();
    renderScripts();
    showToast('Новый скрипт успешно добавлен!');
  });
}

// Helper escape function
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Start application
document.addEventListener('DOMContentLoaded', init);
