// ============================================
// 智能笔记系统 - 完整版 v3.0
// ============================================

const API_URL = '/api';

// ==================== App State ====================
const AppState = {
    // Notes state
    allNotes: [],
    currentFilter: 'all',
    currentSort: 'newest',
    searchQuery: '',
    currentCategory: '',
    notesCurrentPage: 1,
    perPage: 9,
    editingNoteId: null,
    selectedColor: null,
    importedData: null,

    // Ideas state
    allIdeas: [],
    ideaSearchQuery: '',
    ideaCategory: '',
    ideaSort: 'newest',
    ideaCurrentPage: 1,
    ideaPerPage: 10,
    editingIdeaId: null,
    selectedIdeaColor: null,

    // UI state
    activePage: 'notes',
    sidebarCollapsed: false
};

// ==================== Auth Check ====================
let token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');
if (!token) window.location.href = '/';

document.getElementById('userEmail').textContent = user.username || user.id || user.email || '';

// ==================== API Helper ====================
async function apiCall(endpoint, methodOrOptions = {}, data = null) {
    let options = {};

    // 支持两种调用方式:
    // 1. apiCall('/endpoint', { method: 'POST', body: JSON.stringify(data) })
    // 2. apiCall('/endpoint', 'POST', { data })
    if (typeof methodOrOptions === 'string') {
        options = {
            method: methodOrOptions
        };
        if (data) {
            options.body = JSON.stringify(data);
        }
    } else {
        options = methodOrOptions;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(options.headers || {})
        }
    });
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
        return;
    }

    const result = await response.json();

    // 如果HTTP状态码不是2xx，抛出错误
    if (!response.ok) {
        const error = new Error(result.error || result.message || '请求失败');
        error.status = response.status;
        error.data = result;
        throw error;
    }

    return result;
}

// ==================== Notification ====================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// ==================== Utility Functions ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateTimeLocal(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatRelativeDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    return formatDate(dateString).split(' ')[0];
}

function renderMarkdown(content) {
    marked.setOptions({
        breaks: true,
        gfm: true,
        highlight: (code, lang) => {
            if (lang && hljs.getLanguage(lang)) {
                try { return hljs.highlight(code, { language: lang }).value; }
                catch (e) {}
            }
            return hljs.highlightAuto(code).value;
        }
    });
    return marked.parse(content);
}

// ==================== Theme Management ====================
const ThemeManager = {
    STORAGE_KEY: 'theme-preference',

    init() {
        const savedTheme = localStorage.getItem(this.STORAGE_KEY) || 'system';
        this.applyTheme(savedTheme);
        this.updateIcon(savedTheme);

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (localStorage.getItem(this.STORAGE_KEY) === 'system') {
                this.applyTheme('system');
            }
        });
    },

    applyTheme(theme) {
        const html = document.documentElement;
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            html.setAttribute('data-theme', theme);
        }
    },

    updateIcon(theme) {
        const updateBtn = (btnId) => {
            const btn = document.getElementById(btnId);
            if (!btn) return;

            const icon = btn.querySelector('i');
            if (theme === 'dark') {
                icon.className = 'fas fa-moon';
                btn.title = '暗色模式';
            } else if (theme === 'light') {
                icon.className = 'fas fa-sun';
                btn.title = '亮色模式';
            } else {
                icon.className = 'fas fa-circle-half-stroke';
                btn.title = '跟随系统';
            }
        };

        updateBtn('themeBtn');
        updateBtn('mobileThemeBtn');
    },

    toggle() {
        const current = localStorage.getItem(this.STORAGE_KEY) || 'system';
        // Cycle: light -> dark -> system -> light
        const next = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
        localStorage.setItem(this.STORAGE_KEY, next);
        this.applyTheme(next);
        this.updateIcon(next);

        const themeNames = { light: '亮色模式', dark: '暗色模式', system: '跟随系统' };
        showNotification(`已切换到${themeNames[next]}`, 'success');
    }
};

// Initialize theme
ThemeManager.init();

// Theme toggle button
document.getElementById('themeBtn')?.addEventListener('click', () => ThemeManager.toggle());
document.getElementById('mobileThemeBtn')?.addEventListener('click', () => ThemeManager.toggle());

// ==================== Mobile Navigation ====================
const MobileNav = {
    sidebar: document.getElementById('sidebar'),
    overlay: document.getElementById('sidebarOverlay'),
    mobileTitle: document.getElementById('mobileTitle'),

    openSidebar() {
        this.sidebar?.classList.add('open');
        this.overlay?.classList.add('show');
        document.body.style.overflow = 'hidden';
    },

    closeSidebar() {
        this.sidebar?.classList.remove('open');
        this.overlay?.classList.remove('show');
        document.body.style.overflow = '';
    },

    updateTitle(page) {
        const titles = { notes: '待办清单', ideas: '想法记录', timeline: '时光看板' };
        if (this.mobileTitle) {
            this.mobileTitle.textContent = titles[page] || '智能笔记';
        }
    }
};

// Mobile menu button
document.getElementById('mobileMenuBtn')?.addEventListener('click', () => MobileNav.openSidebar());

// Close sidebar when clicking overlay
document.getElementById('sidebarOverlay')?.addEventListener('click', () => MobileNav.closeSidebar());

// Bottom navigation
document.querySelectorAll('.bottom-nav-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        switchPage(page);

        // Update bottom nav active state
        document.querySelectorAll('.bottom-nav-item').forEach(nav => {
            nav.classList.toggle('active', nav.dataset.page === page);
        });
    });
});

// Bottom settings button
document.getElementById('bottomSettingsBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('settingsModal')?.classList.add('show');
});

// ==================== Sidebar Navigation ====================
document.getElementById('sidebarToggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    AppState.sidebarCollapsed = sidebar.classList.contains('collapsed');
});

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        switchPage(page);
    });
});

function switchPage(page) {
    AppState.activePage = page;

    // Update nav active state (sidebar)
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.toggle('active', nav.dataset.page === page);
    });

    // Update bottom nav active state (mobile)
    document.querySelectorAll('.bottom-nav-item').forEach(nav => {
        nav.classList.toggle('active', nav.dataset.page === page);
    });

    // Update mobile title
    MobileNav.updateTitle(page);

    // Close mobile sidebar if open
    MobileNav.closeSidebar();

    // Switch page visibility
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === `${page}Page`);
    });

    // Load data for the page
    if (page === 'notes') {
        loadNotes();
    } else if (page === 'ideas') {
        loadIdeas();
    } else if (page === 'timeline') {
        loadTimeline();
    } else if (page === 'ai') {
        initAIPage();
    }
}

// ==================== Notes Functions ====================
async function loadNotes() {
    try {
        AppState.allNotes = await apiCall('/notes');
        updateCategoryFilter();
        renderNotes();
        updateNotesStats();
    } catch (error) {
        console.error('Error:', error);
        showNotification('加载失败', 'error');
    }
}

function updateNotesStats() {
    const total = AppState.allNotes.length;
    const completed = AppState.allNotes.filter(n => n.completed).length;
    document.getElementById('totalCount').textContent = total;
    document.getElementById('completedCount').textContent = completed;
    document.getElementById('pendingCount').textContent = total - completed;
}

function getFilteredNotes() {
    let filtered = [...AppState.allNotes];

    if (AppState.currentFilter === 'active') filtered = filtered.filter(n => !n.completed);
    else if (AppState.currentFilter === 'completed') filtered = filtered.filter(n => n.completed);
    else if (AppState.currentFilter === 'important') filtered = filtered.filter(n => n.isImportant);
    else if (AppState.currentFilter === 'today') {
        const today = new Date().toDateString();
        filtered = filtered.filter(n => new Date(n.createdAt).toDateString() === today);
    }

    if (AppState.currentCategory) {
        filtered = filtered.filter(n => n.category === AppState.currentCategory);
    }

    if (AppState.searchQuery) {
        const q = AppState.searchQuery.toLowerCase();
        filtered = filtered.filter(n =>
            n.title.toLowerCase().includes(q) ||
            (n.content && n.content.toLowerCase().includes(q)) ||
            (n.category && n.category.toLowerCase().includes(q)) ||
            (n.tags && n.tags.some(tag => tag.toLowerCase().includes(q)))
        );
    }

    filtered.sort((a, b) => {
        if (AppState.currentSort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (AppState.currentSort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (AppState.currentSort === 'priority') {
            const order = { high: 3, medium: 2, low: 1 };
            return order[b.priority] - order[a.priority];
        }
        if (AppState.currentSort === 'dueDate') {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        }
        return 0;
    });

    return filtered;
}

function getPaginatedNotes() {
    const filtered = getFilteredNotes();
    const totalPages = Math.ceil(filtered.length / AppState.perPage) || 1;
    if (AppState.notesCurrentPage > totalPages) AppState.notesCurrentPage = totalPages;
    if (AppState.notesCurrentPage < 1) AppState.notesCurrentPage = 1;

    const start = (AppState.notesCurrentPage - 1) * AppState.perPage;
    return {
        notes: filtered.slice(start, start + AppState.perPage),
        totalNotes: filtered.length,
        totalPages: totalPages
    };
}

function renderNotes() {
    const container = document.getElementById('notesContainer');
    const emptyState = document.getElementById('emptyState');
    const paginationContainer = document.getElementById('paginationContainer');
    const { notes, totalNotes, totalPages } = getPaginatedNotes();

    if (totalNotes === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        paginationContainer.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    paginationContainer.style.display = totalNotes > AppState.perPage ? 'flex' : 'none';

    if (totalNotes > AppState.perPage) {
        document.getElementById('pageInfo').textContent = `第 ${AppState.notesCurrentPage} / ${totalPages} 页`;
        document.getElementById('prevPage').disabled = AppState.notesCurrentPage === 1;
        document.getElementById('nextPage').disabled = AppState.notesCurrentPage === totalPages;
    }

    container.innerHTML = notes.map(createNoteCard).join('');

    // Bind event listeners
    notes.forEach(note => {
        document.getElementById(`complete-${note.id}`)?.addEventListener('click', () => toggleComplete(note.id));
        document.getElementById(`edit-${note.id}`)?.addEventListener('click', () => openEditNoteModal(note));
        document.getElementById(`delete-${note.id}`)?.addEventListener('click', () => deleteNote(note.id));
    });
}

function createNoteCard(note) {
    const completedClass = note.completed ? 'completed' : '';
    const colorStyle = note.color ? `border-left-color: ${note.color};` : '';
    const importantIcon = note.isImportant ? '<i class="fas fa-star star-icon"></i>' : '';

    const priorityText = { high: '高', medium: '中', low: '低' };
    let badges = '';
    if (note.priority) badges += `<span class="badge badge-priority-${note.priority}"><i class="fas fa-flag"></i> ${priorityText[note.priority]}</span>`;
    if (note.category) badges += `<span class="badge badge-category"><i class="fas fa-folder"></i> ${escapeHtml(note.category)}</span>`;
    if (note.format === 'markdown') badges += '<span class="badge badge-format"><i class="fab fa-markdown"></i> MD</span>';

    const tags = note.tags && note.tags.length > 0 ?
        `<div class="note-card-tags">${note.tags.map(t => `<span class="tag"><i class="fas fa-tag"></i> ${escapeHtml(t)}</span>`).join('')}</div>` : '';

    let dates = '';
    if (note.dueDate || note.reminderDate) {
        dates = '<div class="note-card-dates">';
        if (note.dueDate) dates += `<div><i class="fas fa-calendar-alt"></i> 截止: ${formatDate(note.dueDate)}</div>`;
        if (note.reminderDate) {
            const status = note.reminderSent ? '(已发送)' : '';
            dates += `<div><i class="fas fa-bell"></i> 提醒: ${formatDate(note.reminderDate)} ${status}</div>`;
        }
        dates += '</div>';
    }

    let contentHtml = '';
    if (note.content) {
        contentHtml = note.format === 'markdown' ?
            `<div class="note-card-content markdown-body">${renderMarkdown(note.content)}</div>` :
            `<div class="note-card-content">${escapeHtml(note.content)}</div>`;
    }

    const completeText = note.completed ? '取消' : '完成';
    const completeIcon = note.completed ? 'fa-undo' : 'fa-check';

    return `
        <div class="note-card ${completedClass}" style="${colorStyle}">
            <div class="note-card-header">
                <div class="note-card-title">${escapeHtml(note.title)}</div>
                <div class="note-card-icons">${importantIcon}</div>
            </div>
            ${contentHtml}
            ${badges ? `<div class="note-card-meta">${badges}</div>` : ''}
            ${tags}
            ${dates}
            <div class="note-card-actions">
                <button class="note-action-btn complete" id="complete-${note.id}"><i class="fas ${completeIcon}"></i> ${completeText}</button>
                <button class="note-action-btn edit" id="edit-${note.id}"><i class="fas fa-edit"></i> 编辑</button>
                <button class="note-action-btn delete" id="delete-${note.id}"><i class="fas fa-trash"></i> 删除</button>
            </div>
        </div>
    `;
}

function updateCategoryFilter() {
    const categorySelect = document.getElementById('categoryFilterSelect');
    const categories = [...new Set(AppState.allNotes
        .filter(n => n.category)
        .map(n => n.category))];

    const currentValue = categorySelect.value;
    categorySelect.innerHTML = '<option value="">所有分类</option>';
    categories.sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });

    if (currentValue && categories.includes(currentValue)) {
        categorySelect.value = currentValue;
    }
}

async function toggleComplete(id) {
    try {
        await apiCall(`/notes/${id}/toggle`, { method: 'PATCH' });
        await loadNotes();
        showNotification('状态已更新', 'success');
    } catch (error) {
        showNotification('操作失败', 'error');
    }
}

async function deleteNote(id) {
    if (!confirm('确定要删除这个待办吗？')) return;
    try {
        await apiCall(`/notes/${id}`, { method: 'DELETE' });
        await loadNotes();
        showNotification('删除成功', 'success');
    } catch (error) {
        showNotification('删除失败', 'error');
    }
}

async function completeAll() {
    if (!confirm('确定要完成所有待办吗？')) return;
    try {
        await apiCall('/notes/complete-all', { method: 'POST' });
        await loadNotes();
        showNotification('所有待办已标记为完成', 'success');
    } catch (error) {
        showNotification('操作失败', 'error');
    }
}

// ==================== Ideas Functions ====================
async function loadIdeas() {
    try {
        AppState.allIdeas = await apiCall('/ideas');
        updateIdeaCategoryFilter();
        renderIdeas();
        updateIdeasStats();
    } catch (error) {
        console.error('Error:', error);
        showNotification('加载想法失败', 'error');
    }
}

function updateIdeaCategoryFilter() {
    const categories = [...new Set(AppState.allIdeas.map(i => i.category).filter(Boolean))];
    const select = document.getElementById('ideaCategoryFilter');
    const currentValue = select.value;

    select.innerHTML = '<option value="">所有分类</option>';
    categories.forEach(cat => {
        select.innerHTML += `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`;
    });

    // Restore selection if still valid
    if (categories.includes(currentValue)) {
        select.value = currentValue;
    }

    // Also update the datalist for new idea input
    const datalist = document.getElementById('ideaCategoryList');
    if (datalist) {
        const defaultCats = ['灵感', '学习', '工作', '生活', '技术', '产品'];
        const allCats = [...new Set([...defaultCats, ...categories])];
        datalist.innerHTML = allCats.map(cat => `<option value="${escapeHtml(cat)}">`).join('');
    }
}

function updateIdeasStats() {
    const total = AppState.allIdeas.length;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = AppState.allIdeas.filter(i => new Date(i.createdAt) >= weekAgo).length;

    document.getElementById('ideasTotalCount').textContent = total;
    document.getElementById('ideasThisWeek').textContent = thisWeek;
}

function getFilteredIdeas() {
    let filtered = [...AppState.allIdeas];

    if (AppState.ideaCategory) {
        filtered = filtered.filter(i => i.category === AppState.ideaCategory);
    }

    if (AppState.ideaSearchQuery) {
        const q = AppState.ideaSearchQuery.toLowerCase();
        filtered = filtered.filter(i =>
            i.title.toLowerCase().includes(q) ||
            i.content.toLowerCase().includes(q) ||
            (i.tags && i.tags.some(tag => tag.toLowerCase().includes(q)))
        );
    }

    filtered.sort((a, b) => {
        if (AppState.ideaSort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (AppState.ideaSort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        return 0;
    });

    return filtered;
}

function getPaginatedIdeas() {
    const filtered = getFilteredIdeas();
    const totalPages = Math.ceil(filtered.length / AppState.ideaPerPage) || 1;
    if (AppState.ideaCurrentPage > totalPages) AppState.ideaCurrentPage = totalPages;
    if (AppState.ideaCurrentPage < 1) AppState.ideaCurrentPage = 1;

    const start = (AppState.ideaCurrentPage - 1) * AppState.ideaPerPage;
    return {
        ideas: filtered.slice(start, start + AppState.ideaPerPage),
        totalIdeas: filtered.length,
        totalPages: totalPages
    };
}

function renderIdeas() {
    const container = document.getElementById('ideasContainer');
    const emptyState = document.getElementById('ideasEmptyState');
    const paginationContainer = document.getElementById('ideasPaginationContainer');
    const { ideas, totalIdeas, totalPages } = getPaginatedIdeas();

    if (totalIdeas === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        paginationContainer.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    paginationContainer.style.display = totalIdeas > AppState.ideaPerPage ? 'flex' : 'none';

    if (totalIdeas > AppState.ideaPerPage) {
        document.getElementById('ideasPageInfo').textContent = `第 ${AppState.ideaCurrentPage} / ${totalPages} 页`;
        document.getElementById('ideasPrevPage').disabled = AppState.ideaCurrentPage === 1;
        document.getElementById('ideasNextPage').disabled = AppState.ideaCurrentPage === totalPages;
    }

    container.innerHTML = ideas.map(createIdeaCard).join('');

    // Bind event listeners
    ideas.forEach(idea => {
        document.getElementById(`edit-idea-${idea.id}`)?.addEventListener('click', () => openEditIdeaModal(idea));
        document.getElementById(`delete-idea-${idea.id}`)?.addEventListener('click', () => deleteIdea(idea.id));
    });
}

function createIdeaCard(idea) {
    const colorStyle = idea.color ? `border-left-color: ${idea.color};` : '';

    const tags = idea.tags && idea.tags.length > 0 ?
        idea.tags.map(t => `<span class="badge badge-category"><i class="fas fa-tag"></i> ${escapeHtml(t)}</span>`).join('') : '';

    const categoryBadge = idea.category ?
        `<span class="badge badge-category"><i class="fas fa-layer-group"></i> ${escapeHtml(idea.category)}</span>` : '';

    return `
        <div class="idea-card" style="${colorStyle}">
            <div class="idea-card-header">
                <div class="idea-card-title">
                    <i class="fas fa-lightbulb"></i>
                    ${escapeHtml(idea.title)}
                </div>
                <div class="idea-card-date">${formatRelativeDate(idea.createdAt)}</div>
            </div>
            <div class="idea-card-content markdown-body">${renderMarkdown(idea.content)}</div>
            <div class="idea-card-footer">
                <div class="idea-card-meta">
                    ${categoryBadge}
                    ${tags}
                </div>
                <div class="idea-card-actions">
                    <button class="note-action-btn edit" id="edit-idea-${idea.id}"><i class="fas fa-edit"></i></button>
                    <button class="note-action-btn delete" id="delete-idea-${idea.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `;
}

async function deleteIdea(id) {
    if (!confirm('确定要删除这个想法吗？')) return;
    try {
        await apiCall(`/ideas/${id}`, { method: 'DELETE' });
        await loadIdeas();
        showNotification('删除成功', 'success');
    } catch (error) {
        showNotification('删除失败', 'error');
    }
}

// ==================== Modal Handlers ====================
const noteModal = document.getElementById('noteModal');
const ideaModal = document.getElementById('ideaModal');
const settingsModal = document.getElementById('settingsModal');

// Close modal handlers
document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
        noteModal.classList.remove('show');
        ideaModal.classList.remove('show');
        settingsModal.classList.remove('show');
    });
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', () => {
        noteModal.classList.remove('show');
        ideaModal.classList.remove('show');
        settingsModal.classList.remove('show');
    });
});

// Add Note Modal
document.getElementById('addNoteBtn').addEventListener('click', () => {
    AppState.editingNoteId = null;
    AppState.selectedColor = null;
    document.getElementById('modalTitle').textContent = '新建待办';
    document.getElementById('noteForm').reset();
    resetColorPicker('colorPicker');
    noteModal.classList.add('show');
});

// Add Idea Modal
document.getElementById('addIdeaBtn').addEventListener('click', () => {
    AppState.editingIdeaId = null;
    AppState.selectedIdeaColor = null;
    document.getElementById('ideaModalTitle').textContent = '记录想法';
    document.getElementById('ideaForm').reset();
    resetColorPicker('ideaColorPicker');
    ideaModal.classList.add('show');
});

// Color Picker
function resetColorPicker(pickerId) {
    const picker = document.getElementById(pickerId);
    picker.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
    picker.querySelector('.color-option').classList.add('selected');
    if (pickerId === 'colorPicker') {
        document.getElementById('noteColor').value = '';
    } else {
        document.getElementById('ideaColor').value = '';
    }
}

document.getElementById('colorPicker').querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', () => {
        document.getElementById('colorPicker').querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        AppState.selectedColor = option.dataset.color || null;
        document.getElementById('noteColor').value = AppState.selectedColor || '';
    });
});

document.getElementById('ideaColorPicker').querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', () => {
        document.getElementById('ideaColorPicker').querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        AppState.selectedIdeaColor = option.dataset.color || null;
        document.getElementById('ideaColor').value = AppState.selectedIdeaColor || '';
    });
});

// Edit Note Modal
function openEditNoteModal(note) {
    AppState.editingNoteId = note.id;
    document.getElementById('modalTitle').textContent = '编辑待办';
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteContent').value = note.content || '';
    document.getElementById('noteCategory').value = note.category || '';
    document.getElementById('notePriority').value = note.priority;
    document.getElementById('noteTags').value = note.tags ? note.tags.join(', ') : '';
    document.getElementById('noteImportant').checked = note.isImportant || false;

    resetColorPicker('colorPicker');
    if (note.color) {
        const colorOption = document.querySelector(`#colorPicker .color-option[data-color="${note.color}"]`);
        if (colorOption) {
            document.getElementById('colorPicker').querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            colorOption.classList.add('selected');
            AppState.selectedColor = note.color;
            document.getElementById('noteColor').value = note.color;
        }
    }

    document.querySelector(`input[name="noteFormat"][value="${note.format || 'text'}"]`).checked = true;

    if (note.dueDate) document.getElementById('noteDueDate').value = formatDateTimeLocal(note.dueDate);
    else document.getElementById('noteDueDate').value = '';

    if (note.reminderDate) document.getElementById('noteReminderDate').value = formatDateTimeLocal(note.reminderDate);
    else document.getElementById('noteReminderDate').value = '';

    document.querySelectorAll('input[name="reminderMethod"]').forEach(checkbox => {
        checkbox.checked = note.reminderMethods && note.reminderMethods.includes(checkbox.value);
    });

    noteModal.classList.add('show');
}

// Edit Idea Modal
function openEditIdeaModal(idea) {
    AppState.editingIdeaId = idea.id;
    document.getElementById('ideaModalTitle').textContent = '编辑想法';
    document.getElementById('ideaTitle').value = idea.title;
    document.getElementById('ideaContent').value = idea.content || '';
    document.getElementById('ideaCategory').value = idea.category || '灵感';
    document.getElementById('ideaTags').value = idea.tags ? idea.tags.join(', ') : '';

    resetColorPicker('ideaColorPicker');
    if (idea.color) {
        const colorOption = document.querySelector(`#ideaColorPicker .color-option[data-color="${idea.color}"]`);
        if (colorOption) {
            document.getElementById('ideaColorPicker').querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            colorOption.classList.add('selected');
            AppState.selectedIdeaColor = idea.color;
            document.getElementById('ideaColor').value = idea.color;
        }
    }

    ideaModal.classList.add('show');
}

// Note Form Submit
document.getElementById('noteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();

    if (!title) return showNotification('标题不能为空', 'error');
    if (!content) return showNotification('内容不能为空', 'error');

    const noteData = {
        title,
        content,
        category: document.getElementById('noteCategory').value.trim() || null,
        tags: document.getElementById('noteTags').value.split(',').map(t => t.trim()).filter(t => t),
        priority: document.getElementById('notePriority').value,
        dueDate: document.getElementById('noteDueDate').value || null,
        reminderDate: document.getElementById('noteReminderDate').value || null,
        reminderMethods: Array.from(document.querySelectorAll('input[name="reminderMethod"]:checked')).map(cb => cb.value),
        isImportant: document.getElementById('noteImportant').checked,
        format: document.querySelector('input[name="noteFormat"]:checked').value,
        color: AppState.selectedColor
    };

    try {
        if (AppState.editingNoteId) {
            await apiCall(`/notes/${AppState.editingNoteId}`, { method: 'PUT', body: JSON.stringify(noteData) });
            showNotification('更新成功', 'success');
        } else {
            await apiCall('/notes', { method: 'POST', body: JSON.stringify(noteData) });
            showNotification('创建成功', 'success');
        }
        noteModal.classList.remove('show');
        await loadNotes();
    } catch (error) {
        showNotification(error.error || '保存失败', 'error');
    }
});

// Idea Form Submit
document.getElementById('ideaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('ideaTitle').value.trim();
    const content = document.getElementById('ideaContent').value.trim();

    if (!title) return showNotification('标题不能为空', 'error');
    if (!content) return showNotification('内容不能为空', 'error');

    const ideaData = {
        title,
        content,
        category: document.getElementById('ideaCategory').value,
        tags: document.getElementById('ideaTags').value.split(',').map(t => t.trim()).filter(t => t),
        color: AppState.selectedIdeaColor
    };

    try {
        if (AppState.editingIdeaId) {
            await apiCall(`/ideas/${AppState.editingIdeaId}`, { method: 'PUT', body: JSON.stringify(ideaData) });
            showNotification('更新成功', 'success');
        } else {
            await apiCall('/ideas', { method: 'POST', body: JSON.stringify(ideaData) });
            showNotification('想法已记录', 'success');
        }
        ideaModal.classList.remove('show');
        await loadIdeas();
    } catch (error) {
        showNotification(error.error || '保存失败', 'error');
    }
});

// ==================== Filter & Search Handlers ====================
// Notes filters
document.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        AppState.currentFilter = btn.dataset.filter;
        AppState.notesCurrentPage = 1;
        renderNotes();
    });
});

document.getElementById('searchInput').addEventListener('input', (e) => {
    AppState.searchQuery = e.target.value;
    AppState.notesCurrentPage = 1;
    renderNotes();
});

document.getElementById('sortSelect').addEventListener('change', (e) => {
    AppState.currentSort = e.target.value;
    renderNotes();
});

document.getElementById('categoryFilterSelect').addEventListener('change', (e) => {
    AppState.currentCategory = e.target.value;
    AppState.notesCurrentPage = 1;
    renderNotes();
});

document.getElementById('perPageSelect').addEventListener('change', (e) => {
    AppState.perPage = parseInt(e.target.value);
    AppState.notesCurrentPage = 1;
    renderNotes();
});

document.getElementById('prevPage').addEventListener('click', () => {
    if (AppState.notesCurrentPage > 1) {
        AppState.notesCurrentPage--;
        renderNotes();
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    const { totalPages } = getPaginatedNotes();
    if (AppState.notesCurrentPage < totalPages) {
        AppState.notesCurrentPage++;
        renderNotes();
    }
});

// Ideas filters
document.getElementById('ideaSearchInput').addEventListener('input', (e) => {
    AppState.ideaSearchQuery = e.target.value;
    AppState.ideaCurrentPage = 1;
    renderIdeas();
});

document.getElementById('ideaCategoryFilter').addEventListener('change', (e) => {
    AppState.ideaCategory = e.target.value;
    AppState.ideaCurrentPage = 1;
    renderIdeas();
});

document.getElementById('ideaSortSelect').addEventListener('change', (e) => {
    AppState.ideaSort = e.target.value;
    renderIdeas();
});

document.getElementById('ideasPerPageSelect')?.addEventListener('change', (e) => {
    AppState.ideaPerPage = parseInt(e.target.value);
    AppState.ideaCurrentPage = 1;
    renderIdeas();
});

document.getElementById('ideasPrevPage')?.addEventListener('click', () => {
    if (AppState.ideaCurrentPage > 1) {
        AppState.ideaCurrentPage--;
        renderIdeas();
    }
});

document.getElementById('ideasNextPage')?.addEventListener('click', () => {
    const { totalPages } = getPaginatedIdeas();
    if (AppState.ideaCurrentPage < totalPages) {
        AppState.ideaCurrentPage++;
        renderIdeas();
    }
});

// ==================== Toolbar Actions ====================
document.getElementById('completeAllBtn').addEventListener('click', completeAll);

document.getElementById('exportBtn').addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_URL}/notes/export/json`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notes_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showNotification('导出成功', 'success');
    } catch (error) {
        showNotification('导出失败', 'error');
    }
});

document.getElementById('importBtn').addEventListener('click', () => {
    settingsModal.classList.add('show');
    document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="data"]').classList.add('active');
    document.getElementById('dataTab').classList.add('active');
});

document.getElementById('exportIdeasBtn')?.addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_URL}/ideas/export/json`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ideas_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showNotification('导出成功', 'success');
    } catch (error) {
        showNotification('导出失败', 'error');
    }
});

// ==================== Settings ====================
const accountUsernameInput = document.getElementById('accountUsername');
const notificationEmailInput = document.getElementById('notificationEmail');
const telegramChatInput = document.getElementById('telegramChatId');
const testEmailBtn = document.getElementById('testEmailBtn');
const testTelegramBtn = document.getElementById('testTelegramBtn');

function updateUserEmailDisplay() {
    const emailEl = document.getElementById('userEmail');
    if (emailEl) emailEl.textContent = user.username || user.id || user.email || '';
}

function syncAccountUsernameInput() {
    if (!accountUsernameInput) return;
    accountUsernameInput.value = user.username || user.id || '';
}

function syncNotificationEmailInput() {
    if (!notificationEmailInput) return;
    notificationEmailInput.value = user.email || '';
}

function syncTelegramChatIdInput() {
    if (!telegramChatInput) return;
    telegramChatInput.value = user.telegramChatId || '';
}

document.getElementById('settingsBtn').addEventListener('click', () => {
    settingsModal.classList.add('show');
    syncAccountUsernameInput();
    syncNotificationEmailInput();
    syncTelegramChatIdInput();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
});

document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tabName + 'Tab').classList.add('active');
    });
});

document.getElementById('accountForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = accountUsernameInput ? accountUsernameInput.value.trim() : '';

    if (!username) {
        showNotification('用户名不能为空', 'error');
        return;
    }

    try {
        const result = await apiCall('/auth/account', {
            method: 'PUT',
            body: JSON.stringify({ username })
        });

        if (result.token) {
            token = result.token;
            localStorage.setItem('token', result.token);
        }

        if (result.user) {
            user.username = result.user.username || user.username;
            if (result.user.email !== undefined) {
                user.email = result.user.email;
            }
            if (result.user.telegramChatId !== undefined) {
                user.telegramChatId = result.user.telegramChatId;
            }
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            user.username = username;
            localStorage.setItem('user', JSON.stringify(user));
        }

        updateUserEmailDisplay();
        syncAccountUsernameInput();
        showNotification(result.message || '账户设置已更新', 'success');
    } catch (error) {
        const message = error?.data?.error || error?.message || '保存失败';
        showNotification(message, 'error');
    }
});

document.getElementById('notificationForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const telegramChatId = telegramChatInput ? telegramChatInput.value.trim() : '';
    const notificationEmail = notificationEmailInput ? notificationEmailInput.value.trim() : '';

    try {
        await apiCall('/auth/settings', {
            method: 'PUT',
            body: JSON.stringify({
                telegramChatId: telegramChatId || null,
                notificationEmail: notificationEmail || null
            })
        });
        user.telegramChatId = telegramChatId || null;
        user.email = notificationEmail || null;
        localStorage.setItem('user', JSON.stringify(user));
        showNotification('通知设置已保存', 'success');
    } catch (error) {
        showNotification(error.error || '保存失败', 'error');
    }
});

testEmailBtn?.addEventListener('click', async () => {
    const notificationEmail = notificationEmailInput ? notificationEmailInput.value.trim() : '';
    if (!notificationEmail && !user.email) {
        showNotification('请先填写通知邮箱', 'error');
        return;
    }

    const originalHtml = testEmailBtn.innerHTML;
    testEmailBtn.disabled = true;
    testEmailBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发送中...';

    try {
        const result = await apiCall('/auth/settings/test-email', {
            method: 'POST',
            body: JSON.stringify({ notificationEmail })
        });
        showNotification(result.message || '测试邮件已发送', 'success');
    } catch (error) {
        const message = error?.data?.error || error?.message || '发送失败';
        showNotification(message, 'error');
    } finally {
        testEmailBtn.disabled = false;
        testEmailBtn.innerHTML = originalHtml;
    }
});

testTelegramBtn?.addEventListener('click', async () => {
    const telegramChatId = telegramChatInput ? telegramChatInput.value.trim() : '';
    if (!telegramChatId) {
        showNotification('请先填写 Telegram Chat ID', 'error');
        return;
    }

    const originalHtml = testTelegramBtn.innerHTML;
    testTelegramBtn.disabled = true;
    testTelegramBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发送中...';

    try {
        const result = await apiCall('/auth/settings/test-telegram', {
            method: 'POST',
            body: JSON.stringify({ telegramChatId })
        });
        showNotification(result.message || '测试消息已发送', 'success');
    } catch (error) {
        const message = error?.data?.error || error?.message || '发送失败';
        showNotification(message, 'error');
    } finally {
        testTelegramBtn.disabled = false;
        testTelegramBtn.innerHTML = originalHtml;
    }
});

syncAccountUsernameInput();
syncNotificationEmailInput();
syncTelegramChatIdInput();

document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) return showNotification('两次输入的密码不一致', 'error');
    if (newPassword.length < 6) return showNotification('新密码至少需要6位', 'error');

    try {
        await apiCall('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ oldPassword, newPassword })
        });
        showNotification('密码修改成功，请重新登录', 'success');
        setTimeout(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        }, 2000);
    } catch (error) {
        showNotification(error.error || '修改失败', 'error');
    }
});

document.getElementById('exportDataBtn').addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_URL}/notes/export/json`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notes_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showNotification('导出成功', 'success');
    } catch (error) {
        showNotification('导出失败', 'error');
    }
});

document.getElementById('importFileBtn').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
});

document.getElementById('importFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            AppState.importedData = JSON.parse(event.target.result);
            document.getElementById('importOptions').style.display = 'block';
            showNotification('文件读取成功，请选择导入策略', 'success');
        } catch (error) {
            showNotification('JSON文件格式错误', 'error');
        }
    };
    reader.readAsText(file);
});

document.getElementById('confirmImportBtn').addEventListener('click', async () => {
    if (!AppState.importedData) return showNotification('请先选择文件', 'error');
    const strategy = document.querySelector('input[name="importStrategy"]:checked').value;

    try {
        const result = await apiCall('/notes/import', {
            method: 'POST',
            body: JSON.stringify({ notes: AppState.importedData, strategy })
        });
        showNotification(result.message || '导入成功', 'success');
        document.getElementById('importOptions').style.display = 'none';
        AppState.importedData = null;
        document.getElementById('importFileInput').value = '';
        settingsModal.classList.remove('show');
        await loadNotes();
    } catch (error) {
        showNotification(error.error || '导入失败', 'error');
    }
});

// ==================== Timeline / Calendar ====================
const TimelineState = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedDate: new Date(),
    allData: { notes: [], ideas: [] }
};

async function loadTimeline() {
    try {
        // Load both notes and ideas for the timeline
        const [notes, ideas] = await Promise.all([
            apiCall('/notes'),
            apiCall('/ideas')
        ]);
        TimelineState.allData.notes = notes || [];
        TimelineState.allData.ideas = ideas || [];

        renderCalendar();
        renderHeatmap();
        updateTimelineStats();
        selectDate(TimelineState.selectedDate);
    } catch (error) {
        console.error('Timeline load error:', error);
        showNotification('加载时光看板失败', 'error');
    }
}

function renderCalendar() {
    const year = TimelineState.currentYear;
    const month = TimelineState.currentMonth;

    // Update title
    document.getElementById('calendarTitle').textContent = `${year}年${month + 1}月`;

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const container = document.getElementById('calendarDays');
    container.innerHTML = '';

    const today = new Date();
    const todayStr = formatDateKey(today);
    const selectedStr = formatDateKey(TimelineState.selectedDate);

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const date = new Date(year, month - 1, day);
        container.appendChild(createCalendarDay(date, day, true));
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDateKey(date);
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === selectedStr;
        container.appendChild(createCalendarDay(date, day, false, isToday, isSelected));
    }

    // Next month days
    const totalCells = container.children.length;
    const remainingCells = 42 - totalCells; // 6 rows * 7 days
    for (let day = 1; day <= remainingCells; day++) {
        const date = new Date(year, month + 1, day);
        container.appendChild(createCalendarDay(date, day, true));
    }
}

function createCalendarDay(date, dayNum, isOtherMonth, isToday = false, isSelected = false) {
    const div = document.createElement('div');
    div.className = 'calendar-day';
    if (isOtherMonth) div.classList.add('other-month');
    if (isToday) div.classList.add('today');
    if (isSelected) div.classList.add('selected');

    div.innerHTML = `<span>${dayNum}</span>`;

    // Add activity dots
    const dateStr = formatDateKey(date);
    const dayNotes = TimelineState.allData.notes.filter(n => formatDateKey(new Date(n.createdAt)) === dateStr);
    const dayIdeas = TimelineState.allData.ideas.filter(i => formatDateKey(new Date(i.createdAt)) === dateStr);
    const completedNotes = dayNotes.filter(n => n.completed);

    if (dayNotes.length > 0 || dayIdeas.length > 0) {
        const dots = document.createElement('div');
        dots.className = 'activity-dots';
        if (completedNotes.length > 0) dots.innerHTML += '<div class="activity-dot completed"></div>';
        if (dayNotes.length > completedNotes.length) dots.innerHTML += '<div class="activity-dot note"></div>';
        if (dayIdeas.length > 0) dots.innerHTML += '<div class="activity-dot idea"></div>';
        div.appendChild(dots);
    }

    div.addEventListener('click', () => {
        document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
        div.classList.add('selected');
        selectDate(date);
    });

    return div;
}

function selectDate(date) {
    TimelineState.selectedDate = date;
    const dateStr = formatDateKey(date);

    // Update header
    const today = new Date();
    const isToday = formatDateKey(today) === dateStr;
    const isYesterday = formatDateKey(new Date(today.getTime() - 86400000)) === dateStr;

    let titleText = '';
    if (isToday) titleText = '今天';
    else if (isYesterday) titleText = '昨天';
    else titleText = `${date.getMonth() + 1}月${date.getDate()}日`;

    document.getElementById('selectedDateTitle').textContent = titleText;
    document.getElementById('selectedDateFull').textContent = date.toLocaleDateString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });

    // Get day's data
    const dayNotes = TimelineState.allData.notes.filter(n => formatDateKey(new Date(n.createdAt)) === dateStr);
    const dayIdeas = TimelineState.allData.ideas.filter(i => formatDateKey(new Date(i.createdAt)) === dateStr);
    const completed = dayNotes.filter(n => n.completed);

    // Update stats
    document.getElementById('dayNotesCount').textContent = dayNotes.length;
    document.getElementById('dayCompletedCount').textContent = completed.length;
    document.getElementById('dayIdeasCount').textContent = dayIdeas.length;

    // Render timeline
    const timeline = document.getElementById('dayTimeline');
    if (dayNotes.length === 0 && dayIdeas.length === 0) {
        timeline.innerHTML = `
            <div class="empty-day">
                <i class="fas fa-calendar-day"></i>
                <p>这一天没有记录</p>
            </div>
        `;
        return;
    }

    // Combine and sort by time
    const items = [
        ...dayNotes.map(n => ({ type: 'note', data: n, time: new Date(n.createdAt) })),
        ...dayIdeas.map(i => ({ type: 'idea', data: i, time: new Date(i.createdAt) }))
    ].sort((a, b) => b.time - a.time);

    timeline.innerHTML = items.map(item => {
        const isCompleted = item.type === 'note' && item.data.completed;
        const iconClass = isCompleted ? 'completed' : item.type;
        const icon = isCompleted ? 'fa-check' : (item.type === 'note' ? 'fa-clipboard-check' : 'fa-lightbulb');
        const typeLabel = item.type === 'note' ? (isCompleted ? '已完成' : '待办') : '想法';
        const time = item.time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

        return `
            <div class="timeline-item">
                <div class="timeline-item-icon ${iconClass}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="timeline-item-content">
                    <div class="timeline-item-title">${escapeHtml(item.data.title)}</div>
                    <div class="timeline-item-meta">
                        <span class="timeline-item-time"><i class="fas fa-clock"></i> ${time}</span>
                        <span>${typeLabel}</span>
                        ${item.data.category ? `<span><i class="fas fa-folder"></i> ${escapeHtml(item.data.category)}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderHeatmap() {
    const container = document.getElementById('heatmapContainer');
    container.innerHTML = '';

    // Generate last 20 weeks (140 days)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 139);

    // Adjust to start from Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // Count activities per day
    const activityMap = {};
    TimelineState.allData.notes.forEach(n => {
        const key = formatDateKey(new Date(n.createdAt));
        activityMap[key] = (activityMap[key] || 0) + 1;
    });
    TimelineState.allData.ideas.forEach(i => {
        const key = formatDateKey(new Date(i.createdAt));
        activityMap[key] = (activityMap[key] || 0) + 1;
    });

    // Create weeks
    let currentDate = new Date(startDate);
    while (currentDate <= today) {
        const week = document.createElement('div');
        week.className = 'heatmap-week';

        for (let d = 0; d < 7; d++) {
            const day = document.createElement('div');
            day.className = 'heatmap-day';

            const dateStr = formatDateKey(currentDate);
            const count = activityMap[dateStr] || 0;

            if (count >= 5) day.classList.add('level-4');
            else if (count >= 3) day.classList.add('level-3');
            else if (count >= 2) day.classList.add('level-2');
            else if (count >= 1) day.classList.add('level-1');

            day.title = `${currentDate.toLocaleDateString('zh-CN')}: ${count} 条记录`;

            const capturedDate = new Date(currentDate);
            day.addEventListener('click', () => {
                TimelineState.currentYear = capturedDate.getFullYear();
                TimelineState.currentMonth = capturedDate.getMonth();
                renderCalendar();
                selectDate(capturedDate);
            });

            week.appendChild(day);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        container.appendChild(week);
    }
}

function updateTimelineStats() {
    // Calculate streak
    let streak = 0;
    const today = new Date();
    let checkDate = new Date(today);

    while (true) {
        const dateStr = formatDateKey(checkDate);
        const hasActivity = TimelineState.allData.notes.some(n => formatDateKey(new Date(n.createdAt)) === dateStr) ||
                           TimelineState.allData.ideas.some(i => formatDateKey(new Date(i.createdAt)) === dateStr);

        if (hasActivity) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    document.getElementById('streakDays').textContent = streak;

    // This month stats
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthNotes = TimelineState.allData.notes.filter(n => new Date(n.createdAt) >= monthStart);
    const monthIdeas = TimelineState.allData.ideas.filter(i => new Date(i.createdAt) >= monthStart);
    const monthCompleted = monthNotes.filter(n => n.completed);

    document.getElementById('monthCompleted').textContent = monthCompleted.length;
    document.getElementById('monthIdeas').textContent = monthIdeas.length;

    // Week stats
    updateWeekStats();
}

function updateWeekStats() {
    const today = new Date();
    // Get start of week (Monday)
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Filter notes and ideas for this week
    const weekNotes = TimelineState.allData.notes.filter(n => {
        const date = new Date(n.createdAt);
        return date >= weekStart && date < weekEnd;
    });

    const weekIdeas = TimelineState.allData.ideas.filter(i => {
        const date = new Date(i.createdAt);
        return date >= weekStart && date < weekEnd;
    });

    const weekCompleted = weekNotes.filter(n => n.completed);
    const completionRate = weekNotes.length > 0
        ? Math.round((weekCompleted.length / weekNotes.length) * 100)
        : 0;

    // Update UI
    const weekCreatedEl = document.getElementById('weekCreated');
    const weekCompletedEl = document.getElementById('weekCompleted');
    const weekIdeasEl = document.getElementById('weekIdeas');
    const weekRateEl = document.getElementById('weekRate');

    if (weekCreatedEl) weekCreatedEl.textContent = weekNotes.length;
    if (weekCompletedEl) weekCompletedEl.textContent = weekCompleted.length;
    if (weekIdeasEl) weekIdeasEl.textContent = weekIdeas.length;
    if (weekRateEl) weekRateEl.textContent = completionRate + '%';

    // Render week chart
    renderWeekChart(weekStart);
}

function renderWeekChart(weekStart) {
    const container = document.getElementById('weekChart');
    if (!container) return;

    const days = ['一', '二', '三', '四', '五', '六', '日'];
    let maxActivity = 0;
    const dailyData = [];

    // Calculate activity for each day
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = formatDateKey(date);

        const dayNotes = TimelineState.allData.notes.filter(n =>
            formatDateKey(new Date(n.createdAt)) === dateStr
        );
        const dayIdeas = TimelineState.allData.ideas.filter(i =>
            formatDateKey(new Date(i.createdAt)) === dateStr
        );

        const activity = dayNotes.length + dayIdeas.length;
        dailyData.push({ day: days[i], activity, date });
        if (activity > maxActivity) maxActivity = activity;
    }

    // Generate chart HTML
    const maxHeight = 60;
    container.innerHTML = dailyData.map(d => {
        const height = maxActivity > 0 ? (d.activity / maxActivity) * maxHeight : 4;
        const isToday = formatDateKey(d.date) === formatDateKey(new Date());
        return `
            <div class="week-chart-bar">
                <div class="week-chart-fill" style="height: ${Math.max(height, 4)}px; ${isToday ? 'background: var(--success);' : ''}"></div>
                <span class="week-chart-label" style="${isToday ? 'color: var(--success); font-weight: 600;' : ''}">${d.day}</span>
            </div>
        `;
    }).join('');
}

function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Calendar navigation
document.getElementById('prevMonth')?.addEventListener('click', () => {
    TimelineState.currentMonth--;
    if (TimelineState.currentMonth < 0) {
        TimelineState.currentMonth = 11;
        TimelineState.currentYear--;
    }
    renderCalendar();
});

document.getElementById('nextMonth')?.addEventListener('click', () => {
    TimelineState.currentMonth++;
    if (TimelineState.currentMonth > 11) {
        TimelineState.currentMonth = 0;
        TimelineState.currentYear++;
    }
    renderCalendar();
});

document.getElementById('todayBtn')?.addEventListener('click', () => {
    const today = new Date();
    TimelineState.currentMonth = today.getMonth();
    TimelineState.currentYear = today.getFullYear();
    TimelineState.selectedDate = today;
    renderCalendar();
    selectDate(today);
});

// ==================== Initialize ====================
async function init() {
    // Ensure initial filter state matches UI
    document.querySelector('.pill[data-filter="all"]')?.classList.add('active');
    AppState.currentFilter = 'all';

    // Force initial render
    try {
        AppState.allNotes = await apiCall('/notes');
        updateCategoryFilter();
        renderNotes();
        updateNotesStats();
        console.log('Notes loaded:', AppState.allNotes.length);
    } catch (error) {
        console.error('Init error:', error);
    }
}

init();
setInterval(loadNotes, 60000);
console.log('智能笔记系统已加载完成 v3.0');

// ==================== AI Assistant ====================
const AIState = {
    currentConversationId: null,
    conversations: [],
    config: null,
    currentTab: 'chat',
    parsedData: null
};

// Load AI config on page load
async function loadAIConfig() {
    try {
        const config = await apiCall('/ai/config');
        AIState.config = config;

        // Update settings form
        document.getElementById('aiBaseUrl').value = config.provider.baseUrl || '';
        document.getElementById('aiApiKey').value = config.provider.hasApiKey ? config.provider.apiKey : '';
        document.getElementById('aiModel').value = config.provider.model || 'gpt-4o-mini';
        document.getElementById('aiEnabled').checked = config.enabled;
    } catch (error) {
        console.log('AI config not loaded:', error.message);
    }
}

// Load conversations
async function loadConversations() {
    try {
        const conversations = await apiCall('/ai/conversations');
        AIState.conversations = conversations;
        renderConversations();
    } catch (error) {
        console.error('Load conversations error:', error);
    }
}

// Render conversation list
function renderConversations() {
    const container = document.getElementById('aiConversations');
    if (!container) return;

    if (AIState.conversations.length === 0) {
        container.innerHTML = `
            <div class="ai-empty-conversations">
                <p>暂无对话</p>
                <p>点击 + 创建新对话</p>
            </div>
        `;
        return;
    }

    container.innerHTML = AIState.conversations.map(conv => `
        <div class="ai-conversation-item ${conv.id === AIState.currentConversationId ? 'active' : ''}"
             data-id="${conv.id}">
            <div class="conv-title">${conv.title}</div>
            <div class="conv-time">${formatRelativeTime(conv.updatedAt)}</div>
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.ai-conversation-item').forEach(item => {
        item.addEventListener('click', () => selectConversation(item.dataset.id));
    });
}

// Format relative time
function formatRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
}

// Create new conversation
async function createNewConversation() {
    try {
        const conv = await apiCall('/ai/conversations', 'POST', { title: '新对话' });
        AIState.conversations.unshift(conv);
        renderConversations();
        selectConversation(conv.id);
    } catch (error) {
        showNotification('创建对话失败', 'error');
    }
}

// Select conversation
async function selectConversation(id) {
    try {
        const conv = await apiCall(`/ai/conversations/${id}`);
        AIState.currentConversationId = id;

        document.getElementById('currentChatTitle').textContent = conv.title;
        document.getElementById('deleteChatBtn').style.display = 'block';

        renderMessages(conv.messages);
        renderConversations();
    } catch (error) {
        showNotification('加载对话失败', 'error');
    }
}

// Render messages
function renderMessages(messages) {
    const container = document.getElementById('aiMessages');

    if (!messages || messages.length === 0) {
        container.innerHTML = getWelcomeHTML();
        bindQuickActions();
        return;
    }

    container.innerHTML = messages.map(msg => `
        <div class="ai-message ${msg.role}">
            <div class="ai-message-avatar">
                <i class="fas ${msg.role === 'assistant' ? 'fa-robot' : 'fa-user'}"></i>
            </div>
            <div class="ai-message-content">
                ${formatMessageContent(msg.content)}
            </div>
        </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
}

// Get welcome HTML
function getWelcomeHTML() {
    return `
        <div class="ai-welcome">
            <div class="ai-welcome-avatar">
                <div class="ai-welcome-icon">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="ai-welcome-glow"></div>
            </div>
            <h3>你好，我是 AI 助手</h3>
            <p>我可以帮你管理待办事项、规划任务、分析效率趋势，随时向我提问吧</p>
            <div class="ai-suggestions">
                <span class="ai-suggestions-label">快速开始</span>
                <div class="ai-quick-actions">
                    <button class="ai-quick-btn" data-prompt="今天我应该做什么？">
                        <i class="fas fa-sun"></i>
                        <span>今日规划</span>
                    </button>
                    <button class="ai-quick-btn" data-prompt="总结一下我这周的情况">
                        <i class="fas fa-chart-pie"></i>
                        <span>周报总结</span>
                    </button>
                    <button class="ai-quick-btn" data-prompt="帮我分析一下待办优先级">
                        <i class="fas fa-list-check"></i>
                        <span>优先级分析</span>
                    </button>
                    <button class="ai-quick-btn" data-prompt="给我一些提高效率的建议">
                        <i class="fas fa-lightbulb"></i>
                        <span>效率建议</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Bind quick action buttons
function bindQuickActions() {
    document.querySelectorAll('.ai-quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.dataset.prompt;
            if (prompt) sendMessage(prompt);
        });
    });
}

// Format message content (simple markdown)
function formatMessageContent(content) {
    return content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
}

// Send message
async function sendMessage(message) {
    if (!message.trim()) return;

    // Check if we have a conversation
    if (!AIState.currentConversationId) {
        await createNewConversation();
    }

    const messagesContainer = document.getElementById('aiMessages');

    // Clear welcome if present
    const welcome = messagesContainer.querySelector('.ai-welcome');
    if (welcome) welcome.remove();

    // Add user message
    messagesContainer.innerHTML += `
        <div class="ai-message user">
            <div class="ai-message-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="ai-message-content">${formatMessageContent(message)}</div>
        </div>
    `;

    // Add loading indicator
    messagesContainer.innerHTML += `
        <div class="ai-message assistant ai-loading-message">
            <div class="ai-message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="ai-loading">
                <div class="ai-loading-dots">
                    <span></span><span></span><span></span>
                </div>
                <span>思考中...</span>
            </div>
        </div>
    `;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Disable input
    const sendBtn = document.getElementById('aiSendBtn');
    const input = document.getElementById('aiInput');
    sendBtn.disabled = true;
    input.value = '';

    try {
        const response = await apiCall(
            `/ai/conversations/${AIState.currentConversationId}/messages`,
            'POST',
            { message }
        );

        // Remove loading
        messagesContainer.querySelector('.ai-loading-message')?.remove();

        // Add AI response
        messagesContainer.innerHTML += `
            <div class="ai-message assistant">
                <div class="ai-message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="ai-message-content">
                    ${formatMessageContent(response.assistantMessage.content)}
                </div>
            </div>
        `;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Reload conversations to update title
        loadConversations();
    } catch (error) {
        messagesContainer.querySelector('.ai-loading-message')?.remove();
        messagesContainer.innerHTML += `
            <div class="ai-message assistant">
                <div class="ai-message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="ai-message-content" style="color: var(--danger);">
                    ${error.message || '发送失败，请检查AI配置'}
                </div>
            </div>
        `;
    } finally {
        sendBtn.disabled = false;
    }
}

// Delete conversation
async function deleteCurrentConversation() {
    if (!AIState.currentConversationId) return;

    if (!confirm('确定要删除这个对话吗？')) return;

    try {
        await apiCall(`/ai/conversations/${AIState.currentConversationId}`, 'DELETE');
        AIState.currentConversationId = null;
        document.getElementById('currentChatTitle').textContent = '开始新对话';
        document.getElementById('deleteChatBtn').style.display = 'none';
        document.getElementById('aiMessages').innerHTML = getWelcomeHTML();
        bindQuickActions();
        loadConversations();
        showNotification('对话已删除', 'success');
    } catch (error) {
        showNotification('删除失败', 'error');
    }
}

// Switch AI tab
function switchAITab(tab) {
    AIState.currentTab = tab;

    // Update sidebar tab buttons
    document.querySelectorAll('.ai-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update mobile tab buttons
    document.querySelectorAll('.ai-mobile-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update tab content
    document.querySelectorAll('.ai-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const tabMap = {
        'chat': 'aiChatTab',
        'create': 'aiCreateTab',
        'settings': 'aiSettingsTab'
    };
    document.getElementById(tabMap[tab])?.classList.add('active');
}

// Parse input for quick create
async function parseQuickCreate() {
    const input = document.getElementById('quickCreateInput').value.trim();
    if (!input) {
        showNotification('请输入内容', 'warning');
        return;
    }

    const parseBtn = document.getElementById('parseBtn');
    parseBtn.disabled = true;
    parseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>解析中...</span>';

    try {
        const response = await apiCall('/ai/parse', 'POST', { input });

        if (response.success && response.parsed) {
            AIState.parsedData = response.parsed;
            displayParseResult(response.parsed);
        } else {
            showNotification('解析失败', 'error');
        }
    } catch (error) {
        showNotification(error.message || '解析失败', 'error');
    } finally {
        parseBtn.disabled = false;
        parseBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> <span>智能解析</span>';
    }
}

// Display parse result
function displayParseResult(parsed) {
    const resultDiv = document.getElementById('parseResult');
    const emptyState = document.getElementById('parseEmptyState');
    const parseContent = document.getElementById('parseContent');
    const typeDiv = document.getElementById('parseType');
    const fieldsDiv = document.getElementById('parseFields');

    const isNote = parsed.type === 'note';
    typeDiv.innerHTML = `<i class="fas ${isNote ? 'fa-clipboard-check' : 'fa-lightbulb'}"></i> ${isNote ? '待办事项' : '想法记录'}`;

    const data = parsed.data || {};
    let fieldsHtml = '';

    fieldsHtml += `<div class="parse-field"><span class="label">标题</span><span class="value">${data.title || '-'}</span></div>`;

    if (data.content) {
        fieldsHtml += `<div class="parse-field"><span class="label">内容</span><span class="value">${data.content.substring(0, 50)}${data.content.length > 50 ? '...' : ''}</span></div>`;
    }

    if (data.category) {
        fieldsHtml += `<div class="parse-field"><span class="label">分类</span><span class="value">${data.category}</span></div>`;
    }

    if (isNote) {
        if (data.priority) {
            const priorityMap = { high: '🔴 高', medium: '🟡 中', low: '🟢 低' };
            fieldsHtml += `<div class="parse-field"><span class="label">优先级</span><span class="value">${priorityMap[data.priority] || data.priority}</span></div>`;
        }
        if (data.dueDate) {
            fieldsHtml += `<div class="parse-field"><span class="label">截止日期</span><span class="value">${new Date(data.dueDate).toLocaleString('zh-CN')}</span></div>`;
        }
        if (data.reminderDate) {
            fieldsHtml += `<div class="parse-field"><span class="label">提醒时间</span><span class="value">${new Date(data.reminderDate).toLocaleString('zh-CN')}</span></div>`;
        }
        if (data.isImportant) {
            fieldsHtml += `<div class="parse-field"><span class="label">重要</span><span class="value">⭐ 是</span></div>`;
        }
    }

    fieldsDiv.innerHTML = fieldsHtml;

    // Show parse content, hide empty state
    if (emptyState) emptyState.style.display = 'none';
    if (parseContent) parseContent.style.display = 'flex';
    resultDiv.classList.add('has-result');
}

// Confirm create from parsed data
async function confirmQuickCreate() {
    if (!AIState.parsedData) return;

    const parsed = AIState.parsedData;
    const data = parsed.data;

    try {
        if (parsed.type === 'note') {
            await apiCall('/notes', 'POST', {
                title: data.title,
                content: data.content || '',
                category: data.category || null,
                priority: data.priority || 'medium',
                isImportant: data.isImportant || false,
                dueDate: data.dueDate || null,
                reminderDate: data.reminderDate || null,
                reminderMethods: data.reminderDate ? ['email'] : []
            });
            showNotification('待办创建成功', 'success');
            loadNotes();
        } else {
            await apiCall('/ideas', 'POST', {
                title: data.title,
                content: data.content || '',
                category: data.category || ''
            });
            showNotification('想法记录成功', 'success');
        }

        // Reset form
        document.getElementById('quickCreateInput').value = '';
        document.getElementById('parseResult').style.display = 'none';
        AIState.parsedData = null;
    } catch (error) {
        showNotification(error.message || '创建失败', 'error');
    }
}

// Direct create - parse and create in one step
async function directCreate() {
    const input = document.getElementById('quickCreateInput').value.trim();
    if (!input) {
        showNotification('请输入内容', 'warning');
        return;
    }

    const directBtn = document.getElementById('directCreateBtn');
    if (directBtn) {
        directBtn.disabled = true;
        directBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>创建中...</span>';
    }

    try {
        // Step 1: Parse the input
        const parseResponse = await apiCall('/ai/parse', 'POST', { input });

        if (!parseResponse.success || !parseResponse.parsed) {
            showNotification('解析失败，请重试', 'error');
            return;
        }

        const parsed = parseResponse.parsed;
        const data = parsed.data;

        // Step 2: Create the note/idea directly
        if (parsed.type === 'note') {
            await apiCall('/notes', 'POST', {
                title: data.title,
                content: data.content || '',
                category: data.category || null,
                priority: data.priority || 'medium',
                isImportant: data.isImportant || false,
                dueDate: data.dueDate || null,
                reminderDate: data.reminderDate || null,
                reminderMethods: data.reminderDate ? ['email'] : []
            });
            showNotification(`✅ 待办「${data.title}」创建成功`, 'success');
            loadNotes();
        } else {
            await apiCall('/ideas', 'POST', {
                title: data.title,
                content: data.content || '',
                category: data.category || ''
            });
            showNotification(`✅ 想法「${data.title}」记录成功`, 'success');
        }

        // Reset form
        document.getElementById('quickCreateInput').value = '';
        document.getElementById('parseResult').style.display = 'none';
        AIState.parsedData = null;

    } catch (error) {
        showNotification(error.message || '创建失败', 'error');
    } finally {
        if (directBtn) {
            directBtn.disabled = false;
            directBtn.innerHTML = '<i class="fas fa-bolt"></i> <span>直接创建</span>';
        }
    }
}

// Check if auto-create mode is enabled
function isAutoCreateMode() {
    const toggle = document.getElementById('autoCreateMode');
    return toggle && toggle.checked;
}

// Save AI config
async function saveAIConfig() {
    const baseUrl = document.getElementById('aiBaseUrl').value.trim();
    const apiKey = document.getElementById('aiApiKey').value.trim();
    const model = document.getElementById('aiModel').value.trim();
    const enabled = document.getElementById('aiEnabled').checked;

    if (enabled && (!baseUrl || !apiKey)) {
        showNotification('请填写完整的API配置', 'warning');
        return;
    }

    try {
        await apiCall('/ai/config', 'POST', { baseUrl, apiKey, model, enabled });
        showNotification('配置已保存', 'success');
        loadAIConfig();
    } catch (error) {
        showNotification('保存失败', 'error');
    }
}

// Test AI connection
async function testAIConnection() {
    const baseUrl = document.getElementById('aiBaseUrl').value.trim();
    const apiKey = document.getElementById('aiApiKey').value.trim();
    const model = document.getElementById('aiModel').value.trim();

    if (!baseUrl || !apiKey) {
        showNotification('请先填写API配置', 'warning');
        return;
    }

    const statusDiv = document.getElementById('connectionStatus');
    const testBtn = document.getElementById('testConnectionBtn');

    testBtn.disabled = true;
    testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 测试中...';
    statusDiv.className = 'connection-status';
    statusDiv.style.display = 'none';

    try {
        const result = await apiCall('/ai/config/test', 'POST', { baseUrl, apiKey, model });

        if (result.success) {
            statusDiv.className = 'connection-status success';
            statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> 连接成功';
        } else {
            statusDiv.className = 'connection-status error';
            statusDiv.innerHTML = `<i class="fas fa-times-circle"></i> ${result.message}`;
        }
    } catch (error) {
        statusDiv.className = 'connection-status error';
        statusDiv.innerHTML = `<i class="fas fa-times-circle"></i> ${error.message || '连接失败'}`;
    } finally {
        testBtn.disabled = false;
        testBtn.innerHTML = '<i class="fas fa-plug"></i> 测试连接';
    }
}

// AI Event Listeners
document.getElementById('newChatBtn')?.addEventListener('click', createNewConversation);
document.getElementById('deleteChatBtn')?.addEventListener('click', deleteCurrentConversation);

document.getElementById('aiSendBtn')?.addEventListener('click', () => {
    const input = document.getElementById('aiInput');
    sendMessage(input.value);
});

document.getElementById('aiInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(e.target.value);
    }
});

// Auto-resize textarea
document.getElementById('aiInput')?.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// Tab switching - sidebar buttons
document.querySelectorAll('.ai-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchAITab(btn.dataset.tab));
});

// Tab switching - mobile buttons
document.querySelectorAll('.ai-mobile-tab').forEach(btn => {
    btn.addEventListener('click', () => switchAITab(btn.dataset.tab));
});

// Quick actions
document.querySelectorAll('.ai-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const prompt = btn.dataset.prompt;
        sendMessage(prompt);
    });
});

// Example chips for quick create
document.querySelectorAll('.example-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        const example = chip.dataset.example;
        document.getElementById('quickCreateInput').value = example;
    });
});

// Quick create
document.getElementById('parseBtn')?.addEventListener('click', parseQuickCreate);
document.getElementById('directCreateBtn')?.addEventListener('click', directCreate);
document.getElementById('cancelParseBtn')?.addEventListener('click', () => {
    // Reset to empty state
    const emptyState = document.getElementById('parseEmptyState');
    const parseContent = document.getElementById('parseContent');
    const resultDiv = document.getElementById('parseResult');

    if (emptyState) emptyState.style.display = 'flex';
    if (parseContent) parseContent.style.display = 'none';
    resultDiv.classList.remove('has-result');
    AIState.parsedData = null;
});
document.getElementById('confirmCreateBtn')?.addEventListener('click', confirmQuickCreate);

// Auto-create mode: Enter key triggers direct create
document.getElementById('quickCreateInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && isAutoCreateMode()) {
        e.preventDefault();
        directCreate();
    }
});

// Save auto-create mode preference to localStorage
document.getElementById('autoCreateMode')?.addEventListener('change', (e) => {
    localStorage.setItem('aiAutoCreateMode', e.target.checked);
});

// Restore auto-create mode preference on page load
const savedAutoCreateMode = localStorage.getItem('aiAutoCreateMode');
if (savedAutoCreateMode === 'true') {
    const toggle = document.getElementById('autoCreateMode');
    if (toggle) toggle.checked = true;
}

// Settings
document.getElementById('saveAiConfigBtn')?.addEventListener('click', saveAIConfig);
document.getElementById('testConnectionBtn')?.addEventListener('click', testAIConnection);
document.getElementById('toggleApiKey')?.addEventListener('click', () => {
    const input = document.getElementById('aiApiKey');
    const icon = document.getElementById('toggleApiKey').querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
});

// Load AI data when page is AI
function initAIPage() {
    loadAIConfig();
    loadConversations();
    bindQuickActions();
}
