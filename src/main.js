import { CATEGORIES, INITIAL_SCRIPTS } from './data/scriptsData.js';

// Application State
let scripts = [...INITIAL_SCRIPTS];
let activeCategory = 'all';
let searchQuery = '';
let activeModalScript = null;

// Auth & User State
let isAuthenticated = false; // default welcome screen state
let currentUser = {
  name: 'Мария Сергеевна',
  role: 'Учитель начальных классов',
  email: 'teacher@school.edu.ru',
  avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150'
};

// DOM Elements - Header & Brand
const brandHomeBtn = document.getElementById('brand-home-btn');
const loggedOutView = document.getElementById('logged-out-view');
const loggedInView = document.getElementById('logged-in-view');
const headerLoginBtn = document.getElementById('header-login-btn');
const headerTeacherName = document.getElementById('header-teacher-name');
const bannerTeacherName = document.getElementById('banner-teacher-name');

// DOM Elements - User Profile Avatar & Dropdown
const avatarInteractiveZone = document.getElementById('avatar-interactive-zone');
const teacherAvatarImg = document.getElementById('teacher-avatar-img');
const avatarFileInput = document.getElementById('avatar-file-input');
const profileDropdownName = document.getElementById('profile-dropdown-name');
const profileDropdownRole = document.getElementById('profile-dropdown-role');
const changePhotoDropdownBtn = document.getElementById('change-photo-dropdown-btn');
const settingsDropdownBtn = document.getElementById('settings-dropdown-btn');
const logoutDropdownBtn = document.getElementById('logout-dropdown-btn');

// DOM Elements - Sections
const welcomeSection = document.getElementById('welcome-section');
const dashboardBanner = document.getElementById('dashboard-banner');
const welcomeLoginBtn = document.getElementById('welcome-login-btn');
const welcomeDemoBtn = document.getElementById('welcome-demo-btn');
const addScriptMainBtn = document.getElementById('add-script-main-btn');

// DOM Elements - Database & Filters
const categoriesListEl = document.getElementById('categories-list');
const scriptsGridEl = document.getElementById('scripts-grid');
const searchInputEl = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const statsTextEl = document.getElementById('stats-text');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const emptyStateEl = document.getElementById('empty-state');
const emptyResetBtn = document.getElementById('empty-reset-btn');
const toastEl = document.getElementById('toast');

// DOM Elements - Modals
const scriptModalEl = document.getElementById('script-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCategoryEl = document.getElementById('modal-category');
const modalTitleEl = document.getElementById('modal-title');
const modalSituationEl = document.getElementById('modal-situation');
const modalScriptTextEl = document.getElementById('modal-script-text');
const modalTipsListEl = document.getElementById('modal-tips-list');
const modalTagsEl = document.getElementById('modal-tags');
const modalCopyBtn = document.getElementById('modal-copy-btn');

const addModalEl = document.getElementById('add-modal');
const addModalCloseBtn = document.getElementById('add-modal-close-btn');
const addFormCancelBtn = document.getElementById('add-form-cancel-btn');
const addScriptForm = document.getElementById('add-script-form');

const loginModalEl = document.getElementById('login-modal');
const loginModalCloseBtn = document.getElementById('login-modal-close-btn');
const loginForm = document.getElementById('login-form');
const quickDemoLoginBtn = document.getElementById('quick-demo-login-btn');

const settingsModalEl = document.getElementById('settings-modal');
const settingsModalCloseBtn = document.getElementById('settings-modal-close-btn');
const settingsForm = document.getElementById('settings-form');
const settingsNameInput = document.getElementById('settings-name');
const settingsRoleInput = document.getElementById('settings-role');
const settingsEmailInput = document.getElementById('settings-email');
const settingsAvatarImg = document.getElementById('settings-avatar-img');
const settingsChangePhotoBtn = document.getElementById('settings-change-photo-btn');
const settingsCancelBtn = document.getElementById('settings-cancel-btn');

const infoModalEl = document.getElementById('info-modal');
const infoModalCloseBtn = document.getElementById('info-modal-close-btn');
const infoModalTitle = document.getElementById('info-modal-title');
const infoModalContent = document.getElementById('info-modal-content');

// Submenu Buttons
const menuAddScriptBtn = document.getElementById('menu-add-script-btn');
const menuSearchFocus = document.getElementById('menu-search-focus');
const menuPopularScripts = document.getElementById('menu-popular-scripts');
const menuGuideBtn = document.getElementById('menu-guide-btn');
const menuAboutBtn = document.getElementById('menu-about-btn');

// Initialize Application
function init() {
  updateUserUI();
  renderCategories();
  renderScripts();
  setupEventListeners();
}

// Update User & Auth Interface
function updateUserUI() {
  if (isAuthenticated) {
    loggedOutView.classList.add('hidden');
    loggedInView.classList.remove('hidden');
    welcomeSection.classList.add('hidden');
    dashboardBanner.classList.remove('hidden');

    headerTeacherName.textContent = currentUser.name;
    if (bannerTeacherName) bannerTeacherName.textContent = currentUser.name;
    profileDropdownName.textContent = currentUser.name;
    profileDropdownRole.textContent = currentUser.role;
    teacherAvatarImg.src = currentUser.avatar;
    if (settingsAvatarImg) settingsAvatarImg.src = currentUser.avatar;
  } else {
    loggedOutView.classList.remove('hidden');
    loggedInView.classList.add('hidden');
    welcomeSection.classList.remove('hidden');
    dashboardBanner.classList.add('hidden');
  }
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
          <span class="btn-card-action">Читать скрипт ➔</span>
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

  if (script.tips && script.tips.length > 0) {
    modalTipsListEl.innerHTML = script.tips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('');
    document.getElementById('modal-tips-section').classList.remove('hidden');
  } else {
    document.getElementById('modal-tips-section').classList.add('hidden');
  }

  if (script.tags && script.tags.length > 0) {
    modalTagsEl.innerHTML = script.tags.map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join('');
  } else {
    modalTagsEl.innerHTML = '';
  }

  scriptModalEl.classList.remove('hidden');
}

// Close Modals
function closeModals() {
  scriptModalEl.classList.add('hidden');
  addModalEl.classList.add('hidden');
  loginModalEl.classList.add('hidden');
  settingsModalEl.classList.add('hidden');
  infoModalEl.classList.add('hidden');
  activeModalScript = null;
}

// Photo Upload Handler
function handlePhotoUpload(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Пожалуйста, выберите файл изображения (JPEG/PNG).');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    currentUser.avatar = e.target.result;
    updateUserUI();
    showToast('Фото профиля успешно обновлено!');
  };
  reader.readAsDataURL(file);
}

// Copy Text to Clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Текст скопирован в буфер обмена!');
  } catch (err) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Текст скопирован!');
  }
}

// Show Toast Notification
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 2500);
}

// Open Info Modal
function openInfoModal(title, htmlContent) {
  infoModalTitle.textContent = title;
  infoModalContent.innerHTML = htmlContent;
  infoModalEl.classList.remove('hidden');
}

// Setup Event Listeners
function setupEventListeners() {

  // Brand Homepage Reset
  brandHomeBtn.addEventListener('click', () => {
    activeCategory = 'all';
    searchQuery = '';
    searchInputEl.value = '';
    clearSearchBtn.classList.add('hidden');
    renderCategories();
    renderScripts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Главная страница');
  });

  // Top Nav Submenu Quick Category Select
  document.querySelectorAll('.category-quick-select').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = link.dataset.cat;
      if (cat) {
        activeCategory = cat;
        renderCategories();
        renderScripts();
        document.getElementById('database-section').scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Submenu items
  if (menuAddScriptBtn) {
    menuAddScriptBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isAuthenticated) {
        loginModalEl.classList.remove('hidden');
      } else {
        addModalEl.classList.remove('hidden');
      }
    });
  }

  if (menuSearchFocus) {
    menuSearchFocus.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('database-section').scrollIntoView({ behavior: 'smooth' });
      searchInputEl.focus();
    });
  }

  if (menuPopularScripts) {
    menuPopularScripts.addEventListener('click', (e) => {
      e.preventDefault();
      activeCategory = 'all';
      searchQuery = 'родител';
      searchInputEl.value = 'родител';
      clearSearchBtn.classList.remove('hidden');
      renderCategories();
      renderScripts();
      document.getElementById('database-section').scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (menuGuideBtn) {
    menuGuideBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openInfoModal(
        '📖 Руководство по работе с базой',
        `<p>Уважаемый педагог! База TeacherProblem создана для мгновенного поиска проверенных речевых алгоритмов.</p>
        <h3>Как использовать:</h3>
        <ol style="margin-left:20px; margin-top:8px;">
          <li>Выберите категорию ситуации в верхнем меню или с помощью кнопок-тегов.</li>
          <li>Используйте строку поиска для ввода ключевого слова (например: "оценки", "хамство").</li>
          <li>Нажмите на карточку, чтобы открыть полный скрипт ответа и советы.</li>
          <li>Нажмите «📋 Копировать текст», чтобы вставить готовый ответ в мессенджер.</li>
        </ol>`
      );
    });
  }

  if (menuAboutBtn) {
    menuAboutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openInfoModal(
        'ℹ️ О проекте TeacherProblem',
        `<p><strong>TeacherProblem</strong> — современная электронная картотека речевых скриптов и методических рекомендаций для молодых и практикующих учителей.</p>
        <p style="margin-top:10px;">Проект призван снизить уровень стресса при решении сложной коммуникации с родителями, школьниками и школьной администрацией.</p>`
      );
    });
  }

  // Login triggers
  const triggerLogin = () => {
    loginModalEl.classList.remove('hidden');
  };

  headerLoginBtn.addEventListener('click', triggerLogin);
  welcomeLoginBtn.addEventListener('click', triggerLogin);

  // Quick Demo Login
  const performDemoLogin = () => {
    isAuthenticated = true;
    updateUserUI();
    closeModals();
    showToast(`Добро пожаловать, ${currentUser.name}!`);
  };

  welcomeDemoBtn.addEventListener('click', performDemoLogin);
  quickDemoLoginBtn.addEventListener('click', performDemoLogin);

  // Login Form Submit
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameVal = document.getElementById('login-name').value.trim();
    const roleVal = document.getElementById('login-subject').value.trim();
    const emailVal = document.getElementById('login-email').value.trim();

    if (nameVal) currentUser.name = nameVal;
    if (roleVal) currentUser.role = roleVal;
    if (emailVal) currentUser.email = emailVal;

    isAuthenticated = true;
    updateUserUI();
    closeModals();
    showToast(`Успешный вход! С возвращением, ${currentUser.name}`);
  });

  // Photo change interactive area
  // Clicking avatar or plus badge opens file dialog
  avatarInteractiveZone.addEventListener('click', (e) => {
    // If clicking directly on photo/plus badge, open file picker
    if (!e.target.closest('.profile-dropdown-menu')) {
      avatarFileInput.click();
    }
  });

  changePhotoDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    avatarFileInput.click();
  });

  avatarFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handlePhotoUpload(e.target.files[0]);
    }
  });

  // Settings Modal Open
  settingsDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsNameInput.value = currentUser.name;
    settingsRoleInput.value = currentUser.role;
    settingsEmailInput.value = currentUser.email;
    settingsAvatarImg.src = currentUser.avatar;
    settingsModalEl.classList.remove('hidden');
  });

  settingsChangePhotoBtn.addEventListener('click', () => {
    avatarFileInput.click();
  });

  settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    currentUser.name = settingsNameInput.value.trim();
    currentUser.role = settingsRoleInput.value.trim();
    currentUser.email = settingsEmailInput.value.trim();
    updateUserUI();
    closeModals();
    showToast('Настройки профиля сохранены');
  });

  settingsCancelBtn.addEventListener('click', closeModals);

  // Logout
  logoutDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isAuthenticated = false;
    updateUserUI();
    showToast('Вы успешно вышли из системы');
  });

  // Category chip click
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
  loginModalCloseBtn.addEventListener('click', closeModals);
  settingsModalCloseBtn.addEventListener('click', closeModals);
  infoModalCloseBtn.addEventListener('click', closeModals);

  // Close modal on background click
  window.addEventListener('click', (e) => {
    if ([scriptModalEl, addModalEl, loginModalEl, settingsModalEl, infoModalEl].includes(e.target)) {
      closeModals();
    }
  });

  // Copy button in modal
  modalCopyBtn.addEventListener('click', () => {
    if (activeModalScript) {
      copyToClipboard(activeModalScript.scriptText);
    }
  });

  // Add script triggers
  if (addScriptMainBtn) {
    addScriptMainBtn.addEventListener('click', () => {
      addModalEl.classList.remove('hidden');
    });
  }

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
    showToast('Новый скрипт успешно добавлен в базу!');
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
