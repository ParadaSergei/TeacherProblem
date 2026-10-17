import { CATEGORIES, INITIAL_SCRIPTS } from './data/scriptsData.js';

// API Base URL
const API_BASE_URL = 'http://localhost:3001/api';

// Application State
let scripts = [];
let activeCategory = 'all';
let searchQuery = '';
let activeModalScript = null;

// Users list for Admin Panel
let usersList = [];

// Auth & User State
let isAuthenticated = false;
let currentUser = null;

// DOM Elements - Header & Brand
const brandHomeBtn = document.getElementById('brand-home-btn');
const loggedOutView = document.getElementById('logged-out-view');
const loggedInView = document.getElementById('logged-in-view');
const headerLoginBtn = document.getElementById('header-login-btn');
const headerTeacherName = document.getElementById('header-teacher-name');
const bannerTeacherName = document.getElementById('banner-teacher-name');

// Admin Panel Nav Elements
const adminNavDropdown = document.getElementById('admin-nav-dropdown');
const adminPanelMenuBtn = document.getElementById('admin-panel-menu-btn');
const adminPanelDropdownBtn = document.getElementById('admin-panel-dropdown-btn');
const openAdminMainBtn = document.getElementById('open-admin-main-btn');

// User Profile Avatar & Dropdown
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
const welcomeAdminLoginBtn = document.getElementById('welcome-admin-login-btn');
const addScriptMainBtn = document.getElementById('add-script-main-btn');

// Database & Filters
const categoriesListEl = document.getElementById('categories-list');
const scriptsGridEl = document.getElementById('scripts-grid');
const searchInputEl = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const statsTextEl = document.getElementById('stats-text');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const emptyStateEl = document.getElementById('empty-state');
const emptyResetBtn = document.getElementById('empty-reset-btn');
const toastEl = document.getElementById('toast');

// Modals
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
const quickAdminLoginBtn = document.getElementById('quick-admin-login-btn');

const settingsModalEl = document.getElementById('settings-modal');
const settingsModalCloseBtn = document.getElementById('settings-modal-close-btn');
const settingsForm = document.getElementById('settings-form');
const settingsNameInput = document.getElementById('settings-name');
const settingsRoleInput = document.getElementById('settings-role');
const settingsEmailInput = document.getElementById('settings-email');
const settingsAvatarImg = document.getElementById('settings-avatar-img');
const settingsChangePhotoBtn = document.getElementById('settings-change-photo-btn');
const settingsCancelBtn = document.getElementById('settings-cancel-btn');

// Admin Panel Modal Elements
const adminModalEl = document.getElementById('admin-modal');
const adminModalCloseBtn = document.getElementById('admin-modal-close-btn');
const adminAddUserBtn = document.getElementById('admin-add-user-btn');
const adminUsersTbody = document.getElementById('admin-users-tbody');

// Add / Edit User Account Modal Elements
const userFormModalEl = document.getElementById('user-form-modal');
const userFormCloseBtn = document.getElementById('user-form-close-btn');
const userFormCancelBtn = document.getElementById('user-form-cancel-btn');
const userAccountForm = document.getElementById('user-account-form');
const userFormModalTitle = document.getElementById('user-form-modal-title');
const formUserId = document.getElementById('form-user-id');
const formUserName = document.getElementById('form-user-name');
const formUserEmail = document.getElementById('form-user-email');
const formUserRole = document.getElementById('form-user-role');
const formUserPassword = document.getElementById('form-user-password');
const formUserIsAdmin = document.getElementById('form-user-is-admin');

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
async function init() {
  renderCategories();
  await loadScriptsFromAPI();
  updateUserUI();
  setupEventListeners();
}

// Fetch Scripts from Backend SQL API
async function loadScriptsFromAPI() {
  try {
    statsTextEl.textContent = 'Загрузка скриптов из PostgreSQL БД...';
    let url = `${API_BASE_URL}/scripts`;
    const params = new URLSearchParams();

    if (activeCategory !== 'all') params.append('category', activeCategory);
    if (searchQuery.trim() !== '') params.append('search', searchQuery.trim());

    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Ошибка сети при загрузке скриптов');

    const data = await res.json();
    scripts = data.map(item => ({
      id: item.id.toString(),
      category: item.category,
      title: item.title,
      description: item.description || item.situation,
      situation: item.situation,
      scriptText: item.script_text || item.scriptText,
      tips: item.tips || [],
      tags: item.tags || []
    }));

    renderScripts();
  } catch (err) {
    console.warn('⚠️ Используется локальная резервная копия скриптов:', err);
    scripts = [...INITIAL_SCRIPTS];
    renderScripts();
  }
}

// Update User & Auth Interface
function updateUserUI() {
  if (isAuthenticated && currentUser) {
    loggedOutView.classList.add('hidden');
    loggedInView.classList.remove('hidden');
    welcomeSection.classList.add('hidden');
    dashboardBanner.classList.remove('hidden');

    headerTeacherName.textContent = currentUser.name;
    if (bannerTeacherName) bannerTeacherName.textContent = currentUser.name;
    profileDropdownName.textContent = currentUser.name;
    profileDropdownRole.textContent = currentUser.role;

    if (currentUser.avatar) {
      teacherAvatarImg.src = currentUser.avatar;
      if (settingsAvatarImg) settingsAvatarImg.src = currentUser.avatar;
    }

    // Toggle Admin Panel options if user is admin
    if (currentUser.is_admin) {
      adminNavDropdown.classList.remove('hidden');
      adminPanelDropdownBtn.classList.remove('hidden');
      openAdminMainBtn.classList.remove('hidden');
    } else {
      adminNavDropdown.classList.add('hidden');
      adminPanelDropdownBtn.classList.add('hidden');
      openAdminMainBtn.classList.add('hidden');
    }
  } else {
    loggedOutView.classList.remove('hidden');
    loggedInView.classList.add('hidden');
    welcomeSection.classList.remove('hidden');
    dashboardBanner.classList.add('hidden');
    adminNavDropdown.classList.add('hidden');
  }
}

// Render Categories Chips
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

// Render Scripts Grid
function renderScripts() {
  const totalCount = scripts.length;
  statsTextEl.textContent = `Показано ${scripts.length} из ${totalCount} ситуаций в БД`;

  if (activeCategory !== 'all' || searchQuery.trim() !== '') {
    resetFiltersBtn.classList.remove('hidden');
  } else {
    resetFiltersBtn.classList.add('hidden');
  }

  if (scripts.length === 0) {
    scriptsGridEl.innerHTML = '';
    emptyStateEl.classList.remove('hidden');
    return;
  }

  emptyStateEl.classList.add('hidden');

  scriptsGridEl.innerHTML = scripts.map(script => {
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
  const script = scripts.find(s => s.id.toString() === scriptId.toString());
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

// ADMIN PANEL: Fetch Users from SQL API
async function loadAdminUsers() {
  try {
    const res = await fetch(`${API_BASE_URL}/users`);
    if (!res.ok) throw new Error('Ошибка загрузки пользователей');
    usersList = await res.json();
    renderAdminUsersTable();
  } catch (err) {
    showToast('Ошибка работы с базой данных пользователей');
  }
}

// ADMIN PANEL: Render Users Table
function renderAdminUsersTable() {
  adminUsersTbody.innerHTML = usersList.map(u => `
    <tr>
      <td><strong>#${u.id}</strong></td>
      <td>
        <div class="user-cell">
          <img src="${u.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150'}" class="table-avatar-img" />
          <span>${escapeHtml(u.name)}</span>
        </div>
      </td>
      <td>${escapeHtml(u.email)}</td>
      <td>${escapeHtml(u.role || 'Учитель')}</td>
      <td>
        <span class="role-badge ${u.is_admin ? 'admin' : 'teacher'}">
          ${u.is_admin ? '🛡️ Админ' : '👩‍🏫 Учитель'}
        </span>
      </td>
      <td>
        <div class="table-actions">
          <button class="btn-icon edit-user-btn" data-user-id="${u.id}" title="Редактировать">✏️</button>
          <button class="btn-icon danger delete-user-btn" data-user-id="${u.id}" title="Удалить аккаунт">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ADMIN PANEL: Open Add/Edit Account Modal
function openUserFormModal(userId = null) {
  if (userId) {
    const user = usersList.find(u => u.id === userId);
    if (!user) return;

    userFormModalTitle.textContent = 'Редактировать аккаунт';
    formUserId.value = user.id;
    formUserName.value = user.name;
    formUserEmail.value = user.email;
    formUserRole.value = user.role || '';
    formUserPassword.value = '';
    formUserIsAdmin.checked = Boolean(user.is_admin);
  } else {
    userFormModalTitle.textContent = 'Добавить аккаунт учителя';
    userAccountForm.reset();
    formUserId.value = '';
  }

  userFormModalEl.classList.remove('hidden');
}

// Close Modals
function closeModals() {
  scriptModalEl.classList.add('hidden');
  addModalEl.classList.add('hidden');
  loginModalEl.classList.add('hidden');
  settingsModalEl.classList.add('hidden');
  adminModalEl.classList.add('hidden');
  userFormModalEl.classList.add('hidden');
  infoModalEl.classList.add('hidden');
  activeModalScript = null;
}

// Photo Upload Handler
async function handlePhotoUpload(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Пожалуйста, выберите файл изображения (JPEG/PNG).');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const newAvatar = e.target.result;
    if (currentUser) {
      currentUser.avatar = newAvatar;
      updateUserUI();

      // Persist avatar change to backend
      try {
        await fetch(`${API_BASE_URL}/users/${currentUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: newAvatar })
        });
      } catch (err) {
        console.warn('Не удалось сохранить аватар на сервере:', err);
      }
    }
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

// Show Toast
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
    loadScriptsFromAPI();
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
        loadScriptsFromAPI();
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
      loadScriptsFromAPI();
      document.getElementById('database-section').scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (menuGuideBtn) {
    menuGuideBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openInfoModal(
        '📖 Руководство по работе с базой',
        `<p>Уважаемый педагог! База TeacherProblem с PostgreSQL хранит проверенные речевые алгоритмы.</p>
        <h3>Инструкция:</h3>
        <ol style="margin-left:20px; margin-top:8px;">
          <li>Выберите категорию ситуации или используйте поиск.</li>
          <li>Нажмите на карточку для просмотра готового скрипта.</li>
          <li>Скопируйте текст в один клик.</li>
          <li>Администраторы могут управлять аккаунтами учителей в Панели администратора.</li>
        </ol>`
      );
    });
  }

  if (menuAboutBtn) {
    menuAboutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openInfoModal(
        'ℹ️ О проекте TeacherProblem',
        `<p><strong>TeacherProblem</strong> — система скриптов общения для педагогов с полноценной базой данных PostgreSQL.</p>`
      );
    });
  }

  // Login triggers
  headerLoginBtn.addEventListener('click', () => loginModalEl.classList.remove('hidden'));
  welcomeLoginBtn.addEventListener('click', () => {
    document.getElementById('login-email').value = 'teacher@school.edu.ru';
    document.getElementById('login-password').value = 'teacher123';
    loginModalEl.classList.remove('hidden');
  });

  welcomeAdminLoginBtn.addEventListener('click', () => {
    document.getElementById('login-email').value = 'admin@school.edu.ru';
    document.getElementById('login-password').value = 'admin123';
    loginModalEl.classList.remove('hidden');
  });

  quickAdminLoginBtn.addEventListener('click', () => {
    document.getElementById('login-email').value = 'admin@school.edu.ru';
    document.getElementById('login-password').value = 'admin123';
  });

  // Login Form Submit (SQL Backend Auth)
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка аутентификации');

      currentUser = data.user;
      isAuthenticated = true;
      updateUserUI();
      closeModals();
      showToast(`С возвращением, ${currentUser.name}!`);
    } catch (err) {
      showToast(err.message);
    }
  });

  // Open Admin Panel
  const openAdminPanel = async () => {
    await loadAdminUsers();
    adminModalEl.classList.remove('hidden');
  };

  adminPanelMenuBtn.addEventListener('click', openAdminPanel);
  adminPanelDropdownBtn.addEventListener('click', openAdminPanel);
  if (openAdminMainBtn) openAdminMainBtn.addEventListener('click', openAdminPanel);

  // Admin Panel: Add User Button
  adminAddUserBtn.addEventListener('click', () => openUserFormModal());

  // Admin Panel: Edit & Delete User Delegation
  adminUsersTbody.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.edit-user-btn');
    const deleteBtn = e.target.closest('.delete-user-btn');

    if (editBtn) {
      const userId = parseInt(editBtn.dataset.userId, 10);
      openUserFormModal(userId);
    }

    if (deleteBtn) {
      const userId = parseInt(deleteBtn.dataset.userId, 10);
      if (confirm('Вы уверены, что хотите удалить этот аккаунт учителя из БД?')) {
        try {
          const res = await fetch(`${API_BASE_URL}/users/${userId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Ошибка удаления аккаунта');
          showToast('Аккаунт учителя успешно удален из БД');
          await loadAdminUsers();
        } catch (err) {
          showToast(err.message);
        }
      }
    }
  });

  // Admin Panel: Save User Form (Add / Edit SQL)
  userAccountForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = formUserId.value;
    const name = formUserName.value.trim();
    const email = formUserEmail.value.trim();
    const role = formUserRole.value.trim();
    const password = formUserPassword.value.trim();
    const is_admin = formUserIsAdmin.checked;

    const payload = { name, email, role, is_admin };
    if (password) payload.password = password;

    try {
      let res;
      if (id) {
        // Update user
        res = await fetch(`${API_BASE_URL}/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new user
        res = await fetch(`${API_BASE_URL}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Ошибка сохранения пользователя');
      }

      userFormModalEl.classList.add('hidden');
      showToast(id ? 'Аккаунт учителя обновился!' : 'Новый аккаунт создан в БД!');
      await loadAdminUsers();
    } catch (err) {
      showToast(err.message);
    }
  });

  userFormCloseBtn.addEventListener('click', () => userFormModalEl.classList.add('hidden'));
  userFormCancelBtn.addEventListener('click', () => userFormModalEl.classList.add('hidden'));

  // Photo change interactive area
  avatarInteractiveZone.addEventListener('click', (e) => {
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
    if (currentUser) {
      settingsNameInput.value = currentUser.name;
      settingsRoleInput.value = currentUser.role;
      settingsEmailInput.value = currentUser.email;
      if (currentUser.avatar) settingsAvatarImg.src = currentUser.avatar;
    }
    settingsModalEl.classList.remove('hidden');
  });

  settingsChangePhotoBtn.addEventListener('click', () => {
    avatarFileInput.click();
  });

  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    currentUser.name = settingsNameInput.value.trim();
    currentUser.role = settingsRoleInput.value.trim();
    currentUser.email = settingsEmailInput.value.trim();

    try {
      await fetch(`${API_BASE_URL}/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentUser.name,
          role: currentUser.role,
          email: currentUser.email
        })
      });
    } catch (err) {
      console.warn('Ошибка сохранения профиля:', err);
    }

    updateUserUI();
    closeModals();
    showToast('Настройки профиля сохранены в БД');
  });

  settingsCancelBtn.addEventListener('click', closeModals);

  // Logout
  logoutDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isAuthenticated = false;
    currentUser = null;
    updateUserUI();
    showToast('Вы вышли из системы');
  });

  // Category chip click
  categoriesListEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.category-chip');
    if (!chip) return;

    activeCategory = chip.dataset.categoryId;
    renderCategories();
    loadScriptsFromAPI();
  });

  // Search input
  searchInputEl.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (searchQuery.length > 0) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }
    loadScriptsFromAPI();
  });

  // Clear search
  clearSearchBtn.addEventListener('click', () => {
    searchQuery = '';
    searchInputEl.value = '';
    clearSearchBtn.classList.add('hidden');
    loadScriptsFromAPI();
  });

  // Reset filters
  const resetFilters = () => {
    activeCategory = 'all';
    searchQuery = '';
    searchInputEl.value = '';
    clearSearchBtn.classList.add('hidden');
    renderCategories();
    loadScriptsFromAPI();
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
  adminModalCloseBtn.addEventListener('click', closeModals);
  infoModalCloseBtn.addEventListener('click', closeModals);

  // Close modal on background click
  window.addEventListener('click', (e) => {
    if ([scriptModalEl, addModalEl, loginModalEl, settingsModalEl, adminModalEl, userFormModalEl, infoModalEl].includes(e.target)) {
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

  // Submit new script form (POST to SQL API)
  addScriptForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const category = document.getElementById('form-category').value;
    const title = document.getElementById('form-title').value.trim();
    const situation = document.getElementById('form-situation').value.trim();
    const scriptText = document.getElementById('form-script').value.trim();
    const tipsRaw = document.getElementById('form-tips').value.trim();
    const tagsRaw = document.getElementById('form-tags').value.trim();

    const tips = tipsRaw ? tipsRaw.split('\n').filter(t => t.trim() !== '') : [];
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(t => t !== '') : [];

    const payload = {
      category,
      title,
      description: situation.slice(0, 100) + '...',
      situation,
      script_text: scriptText,
      tips,
      tags
    };

    try {
      const res = await fetch(`${API_BASE_URL}/scripts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Ошибка сохранения скрипта в БД');

      addScriptForm.reset();
      closeModals();
      await loadScriptsFromAPI();
      showToast('Новый скрипт успешно сохранен в базе!');
    } catch (err) {
      showToast(err.message);
    }
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
