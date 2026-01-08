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

    // Diaries state
    allDiaries: [],
    diarySearchQuery: '',
    diaryMood: '',
    diaryRange: 'all',
    diarySort: 'newest',
    diaryCurrentPage: 1,
    diaryPerPage: 9,
    editingDiaryId: null,

    // Goals state
    allGoals: [],
    goalSearchQuery: '',
    goalStatus: '',
    goalRecordType: '',
    goalSort: 'updated',
    editingGoalId: null,
    editingGoalRecordId: null,
    goalRecordTargetId: null,

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
        const titles = { notes: '待办清单', ideas: '想法记录', diary: '日记', goals: '长期目标', timeline: '时光看板' };
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
    } else if (page === 'diary') {
        loadDiaries();
    } else if (page === 'goals') {
        loadGoals();
    } else if (page === 'timeline') {
        loadTimeline();
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

// ==================== Diaries Functions ====================
const DIARY_DEFAULT_MOODS = ['开心', '平静', '低落', '焦虑', '兴奋'];
const DIARY_MOOD_ICON_MAP = {
    开心: 'fa-face-smile',
    平静: 'fa-face-meh',
    低落: 'fa-face-frown',
    焦虑: 'fa-face-grimace',
    兴奋: 'fa-face-grin-stars'
};

function formatDateOnly(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function toDateInputValue(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return formatDateKey(date);
}

async function loadDiaries() {
    try {
        AppState.allDiaries = await apiCall('/diaries');
        updateDiaryMoodFilter();
        renderDiaries();
        updateDiaryStats();
    } catch (error) {
        console.error('Error:', error);
        showNotification('加载日记失败', 'error');
    }
}

function updateDiaryStats() {
    const total = AppState.allDiaries.length;
    const now = new Date();
    const monthCount = AppState.allDiaries.filter(d => {
        const date = new Date(d.entryDate || d.createdAt);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    const streak = calculateDiaryStreak();

    document.getElementById('diaryTotalCount').textContent = total;
    document.getElementById('diaryMonthCount').textContent = monthCount;
    document.getElementById('diaryStreakCount').textContent = streak;
}

function calculateDiaryStreak() {
    if (!AppState.allDiaries.length) return 0;
    const dateKeys = new Set(
        AppState.allDiaries.map(d => formatDateKey(new Date(d.entryDate || d.createdAt)))
    );
    const sortedDates = Array.from(dateKeys).sort((a, b) => new Date(b) - new Date(a));
    let streak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diffDays = (prev - curr) / (1000 * 60 * 60 * 24);
        if (diffDays === 1) {
            streak += 1;
        } else {
            break;
        }
    }
    return streak;
}

function updateDiaryMoodFilter() {
    const select = document.getElementById('diaryMoodFilter');
    if (!select) return;
    const moods = new Set(DIARY_DEFAULT_MOODS);
    AppState.allDiaries.forEach(d => {
        if (d.mood) moods.add(d.mood);
    });
    const currentValue = select.value;
    select.innerHTML = '<option value="">全部心情</option>';
    Array.from(moods).forEach(mood => {
        select.innerHTML += `<option value="${escapeHtml(mood)}">${escapeHtml(mood)}</option>`;
    });
    if (currentValue) select.value = currentValue;
}

function stripMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[`*_>#~\-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function getFilteredDiaries() {
    let filtered = [...AppState.allDiaries];
    if (AppState.diaryMood) {
        filtered = filtered.filter(d => d.mood === AppState.diaryMood);
    }
    if (AppState.diaryRange && AppState.diaryRange !== 'all') {
        const now = new Date();
        filtered = filtered.filter(d => {
            const dateValue = new Date(d.entryDate || d.createdAt);
            if (Number.isNaN(dateValue.getTime())) return false;
            if (AppState.diaryRange === 'year') {
                return dateValue.getFullYear() === now.getFullYear();
            }
            const windowDays = AppState.diaryRange === '7d' ? 7 : 30;
            const diffDays = (now - dateValue) / (1000 * 60 * 60 * 24);
            return diffDays >= 0 && diffDays <= windowDays;
        });
    }
    if (AppState.diarySearchQuery) {
        const q = AppState.diarySearchQuery.toLowerCase();
        filtered = filtered.filter(d =>
            (d.title && d.title.toLowerCase().includes(q)) ||
            (d.content && d.content.toLowerCase().includes(q)) ||
            (d.tags && d.tags.some(tag => tag.toLowerCase().includes(q))) ||
            (d.mood && d.mood.toLowerCase().includes(q))
        );
    }
    filtered.sort((a, b) => {
        const dateA = new Date(a.entryDate || a.createdAt);
        const dateB = new Date(b.entryDate || b.createdAt);
        if (AppState.diarySort === 'oldest') return dateA - dateB;
        return dateB - dateA;
    });
    return filtered;
}

function getPaginatedDiaries() {
    const filtered = getFilteredDiaries();
    const totalPages = Math.ceil(filtered.length / AppState.diaryPerPage) || 1;
    if (AppState.diaryCurrentPage > totalPages) AppState.diaryCurrentPage = totalPages;
    if (AppState.diaryCurrentPage < 1) AppState.diaryCurrentPage = 1;

    const start = (AppState.diaryCurrentPage - 1) * AppState.diaryPerPage;
    return {
        diaries: filtered.slice(start, start + AppState.diaryPerPage),
        totalDiaries: filtered.length,
        totalPages
    };
}

function renderDiaries() {
    const container = document.getElementById('diaryContainer');
    const emptyState = document.getElementById('diaryEmptyState');
    const paginationContainer = document.getElementById('diaryPaginationContainer');
    if (!container) return;

    const { diaries, totalDiaries, totalPages } = getPaginatedDiaries();

    if (totalDiaries === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        paginationContainer.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    paginationContainer.style.display = totalDiaries > AppState.diaryPerPage ? 'flex' : 'none';

    if (totalDiaries > AppState.diaryPerPage) {
        document.getElementById('diaryPageInfo').textContent = `第 ${AppState.diaryCurrentPage} / ${totalPages} 页`;
        document.getElementById('diaryPrevPage').disabled = AppState.diaryCurrentPage === 1;
        document.getElementById('diaryNextPage').disabled = AppState.diaryCurrentPage === totalPages;
    }

    container.innerHTML = diaries.map((diary, index) => createDiaryCard(diary, index)).join('');
    diaries.forEach(diary => {
        document.getElementById(`edit-diary-${diary.id}`)?.addEventListener('click', () => openEditDiaryModal(diary));
        document.getElementById(`delete-diary-${diary.id}`)?.addEventListener('click', () => deleteDiary(diary.id));
    });

    container.querySelectorAll('.diary-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const diaryId = toggle.dataset.diaryId;
            if (!diaryId) return;
            toggleDiaryCard(diaryId);
        });
    });
}

function createDiaryCard(diary, index) {
    const mood = diary.mood || '平静';
    const moodIcon = DIARY_MOOD_ICON_MAP[mood] || 'fa-face-smile';
    const tags = diary.tags && diary.tags.length > 0
        ? diary.tags.map(t => `<span class="badge badge-category"><i class="fas fa-tag"></i> ${escapeHtml(t)}</span>`).join('')
        : '';
    const weatherBadge = diary.weather
        ? `<span class="badge badge-weather"><i class="fas fa-cloud-sun"></i> ${escapeHtml(diary.weather)}</span>`
        : '';
    const contentText = stripMarkdown(diary.content || '');
    const shouldToggle = contentText.length > 240;
    const contentHtml = diary.content
        ? renderMarkdown(diary.content)
        : '<p class="diary-card-placeholder">暂无内容</p>';

    const toggleClass = shouldToggle ? ' has-toggle' : '';

    return `
        <div class="diary-card diary-review-card${toggleClass}" data-diary-id="${escapeHtml(String(diary.id))}" style="--stagger: ${index}">
            <div class="diary-card-header">
                <div class="diary-card-title">
                    <i class="fas fa-book-open"></i>
                    ${escapeHtml(diary.title || '无标题日记')}
                </div>
                <div class="diary-card-date">${formatDateOnly(diary.entryDate || diary.createdAt)}</div>
            </div>
            <div class="diary-card-meta">
                <span class="badge badge-mood"><i class="fas ${moodIcon}"></i> ${escapeHtml(mood)}</span>
                ${weatherBadge}
                ${tags}
            </div>
            <div class="diary-card-content markdown-body">${contentHtml}</div>
            <div class="diary-card-footer">
                ${shouldToggle ? `<button class="diary-toggle" data-diary-id="${escapeHtml(String(diary.id))}">展开</button>` : ''}
                <div class="diary-card-actions">
                    <button class="note-action-btn edit" id="edit-diary-${diary.id}"><i class="fas fa-edit"></i></button>
                    <button class="note-action-btn delete" id="delete-diary-${diary.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `;
}

function toggleDiaryCard(diaryId) {
    const card = document.querySelector(`.diary-card[data-diary-id="${diaryId}"]`);
    if (!card) return;
    const isExpanded = card.classList.toggle('is-expanded');
    const toggleBtn = card.querySelector('.diary-toggle');
    if (toggleBtn) toggleBtn.textContent = isExpanded ? '收起' : '展开';
}

async function deleteDiary(id) {
    if (!confirm('确定要删除这篇日记吗？')) return;
    try {
        await apiCall(`/diaries/${id}`, { method: 'DELETE' });
        await loadDiaries();
        showNotification('删除成功', 'success');
    } catch (error) {
        showNotification('删除失败', 'error');
    }
}

function openEditDiaryModal(diary) {
    AppState.editingDiaryId = diary.id;
    document.getElementById('diaryModalTitle').textContent = '编辑日记';
    document.getElementById('diaryTitle').value = diary.title || '';
    document.getElementById('diaryContent').value = diary.content || '';
    document.getElementById('diaryMood').value = diary.mood || '平静';
    document.getElementById('diaryWeather').value = diary.weather || '';
    document.getElementById('diaryTags').value = diary.tags ? diary.tags.join(', ') : '';
    document.getElementById('diaryDate').value = toDateInputValue(diary.entryDate || diary.createdAt);
    diaryModal.classList.add('show');
}

// ==================== Goals Functions ====================
const GOAL_STATUS_LABELS = { active: '进行中', paused: '暂停', completed: '已完成' };
const GOAL_TYPE_LABELS = { inspiration: '灵感', insight: '洞察', resource: '资料' };
const GOAL_TYPE_ICONS = { inspiration: 'fa-lightbulb', insight: 'fa-brain', resource: 'fa-folder-open' };

async function loadGoals() {
    try {
        AppState.allGoals = await apiCall('/goals');
        renderGoals();
        updateGoalsStats();
    } catch (error) {
        console.error('Error:', error);
        showNotification('加载目标失败', 'error');
    }
}

function updateGoalsStats() {
    const total = AppState.allGoals.length;
    const active = AppState.allGoals.filter(g => g.status === 'active').length;
    const completed = AppState.allGoals.filter(g => g.status === 'completed').length;
    const records = AppState.allGoals.reduce((sum, g) => sum + (g.records ? g.records.length : 0), 0);

    document.getElementById('goalsTotalCount').textContent = total;
    document.getElementById('goalsActiveCount').textContent = active;
    document.getElementById('goalsRecordCount').textContent = records;
    document.getElementById('goalsCompletedCount').textContent = completed;
}

function getFilteredGoals() {
    let filtered = [...AppState.allGoals];
    if (AppState.goalStatus) {
        filtered = filtered.filter(g => g.status === AppState.goalStatus);
    }
    if (AppState.goalSearchQuery) {
        const q = AppState.goalSearchQuery.toLowerCase();
        filtered = filtered.filter(g =>
            g.title.toLowerCase().includes(q) ||
            (g.vision && g.vision.toLowerCase().includes(q)) ||
            (g.category && g.category.toLowerCase().includes(q)) ||
            (g.tags && g.tags.some(tag => tag.toLowerCase().includes(q))) ||
            (g.records || []).some(r =>
                (r.title && r.title.toLowerCase().includes(q)) ||
                (r.content && r.content.toLowerCase().includes(q)) ||
                (r.tags && r.tags.some(tag => tag.toLowerCase().includes(q)))
            )
        );
    }
    filtered.sort((a, b) => {
        if (AppState.goalSort === 'created') return new Date(a.createdAt) - new Date(b.createdAt);
        if (AppState.goalSort === 'progress') return (b.progress || 0) - (a.progress || 0);
        if (AppState.goalSort === 'targetDate') {
            if (!a.targetDate) return 1;
            if (!b.targetDate) return -1;
            return new Date(a.targetDate) - new Date(b.targetDate);
        }
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
    });
    return filtered;
}

function renderGoals() {
    const container = document.getElementById('goalsContainer');
    const emptyState = document.getElementById('goalsEmptyState');
    if (!container) return;

    const goals = getFilteredGoals();
    if (goals.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    container.innerHTML = goals.map((goal, index) => createGoalCard(goal, index)).join('');

    goals.forEach(goal => {
        document.getElementById(`edit-goal-${goal.id}`)?.addEventListener('click', () => openEditGoalModal(goal));
        document.getElementById(`delete-goal-${goal.id}`)?.addEventListener('click', () => deleteGoal(goal.id));
        document.getElementById(`add-record-${goal.id}`)?.addEventListener('click', () => openGoalRecordModal(goal));
        (goal.records || []).forEach(record => {
            document.getElementById(`edit-record-${goal.id}-${record.id}`)?.addEventListener('click', () => openGoalRecordModal(goal, record));
            document.getElementById(`delete-record-${goal.id}-${record.id}`)?.addEventListener('click', () => deleteGoalRecord(goal.id, record.id));
        });
    });
}

function createGoalCard(goal, index) {
    const statusLabel = GOAL_STATUS_LABELS[goal.status] || '进行中';
    const progress = Math.min(100, Math.max(0, goal.progress || 0));
    const categoryBadge = goal.category
        ? `<span class="badge badge-category"><i class="fas fa-folder-open"></i> ${escapeHtml(goal.category)}</span>`
        : '';
    const tags = goal.tags && goal.tags.length > 0
        ? goal.tags.map(t => `<span class="badge badge-category"><i class="fas fa-tag"></i> ${escapeHtml(t)}</span>`).join('')
        : '';
    const dateRange = goal.startDate || goal.targetDate
        ? `${goal.startDate ? formatDateOnly(goal.startDate) : '未设定'} → ${goal.targetDate ? formatDateOnly(goal.targetDate) : '未设定'}`
        : '未设定时间范围';

    const recordType = AppState.goalRecordType;
    const recordLabel = recordType ? `${GOAL_TYPE_LABELS[recordType] || '记录'}记录` : '灵感/资料';
    const records = goal.records || [];
    const visibleRecords = recordType ? records.filter(record => record.type === recordType) : records;
    const recordsHtml = visibleRecords.length
        ? visibleRecords
            .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
            .map(record => createGoalRecordItem(goal.id, record))
            .join('')
        : `<div class="goal-record-empty">${recordType ? '当前筛选下暂无记录' : '还没有记录，先添加一条灵感或资料'}</div>`;

    return `
        <div class="goal-card goal-review-card" style="--stagger: ${index}">
            <div class="goal-card-header">
                <div class="goal-title">
                    <span class="goal-status ${escapeHtml(goal.status || 'active')}">
                        <i class="fas fa-circle"></i> ${statusLabel}
                    </span>
                    <h3>${escapeHtml(goal.title)}</h3>
                    ${goal.vision ? `<p class="goal-vision">${escapeHtml(goal.vision)}</p>` : ''}
                </div>
                <div class="goal-actions">
                    <button class="note-action-btn edit" id="edit-goal-${goal.id}"><i class="fas fa-edit"></i></button>
                    <button class="note-action-btn delete" id="delete-goal-${goal.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="goal-meta">
                ${categoryBadge}
                ${tags}
                <span class="goal-dates"><i class="fas fa-calendar-alt"></i> ${dateRange}</span>
            </div>
            <div class="goal-progress">
                <div class="goal-progress-bar">
                    <div class="goal-progress-fill" style="width: ${progress}%"></div>
                </div>
                <span class="goal-progress-label">${progress}%</span>
            </div>
            <div class="goal-records">
                <div class="goal-records-header">
                    <span>${recordLabel}</span>
                    <button class="btn btn-ghost" id="add-record-${goal.id}">
                        <i class="fas fa-plus"></i> 添加记录
                    </button>
                </div>
                <div class="goal-records-list">
                    ${recordsHtml}
                </div>
            </div>
        </div>
    `;
}

function createGoalRecordItem(goalId, record) {
    const typeLabel = GOAL_TYPE_LABELS[record.type] || '灵感';
    const typeIcon = GOAL_TYPE_ICONS[record.type] || 'fa-lightbulb';
    const recordTags = record.tags && record.tags.length > 0
        ? record.tags.map(t => `<span><i class="fas fa-tag"></i> ${escapeHtml(t)}</span>`).join('')
        : '';

    const content = record.content ? record.content.trim() : '';
    const shortContent = content.length > 120 ? `${content.slice(0, 120)}...` : content;

    return `
        <div class="goal-record-item">
            <div class="goal-record-icon ${escapeHtml(record.type || 'inspiration')}">
                <i class="fas ${typeIcon}"></i>
            </div>
            <div class="goal-record-body">
                <div class="goal-record-title">${escapeHtml(record.title || typeLabel)}</div>
                <div class="goal-record-text">${escapeHtml(shortContent)}</div>
                <div class="goal-record-meta">
                    <span><i class="fas fa-layer-group"></i> ${typeLabel}</span>
                    <span><i class="fas fa-calendar-day"></i> ${formatDateOnly(record.date || record.createdAt)}</span>
                    ${recordTags}
                </div>
            </div>
            <div class="goal-record-actions">
                <button class="record-action-btn" id="edit-record-${goalId}-${record.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="record-action-btn" id="delete-record-${goalId}-${record.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

async function deleteGoal(id) {
    if (!confirm('确定要删除这个目标吗？所有记录也会被移除。')) return;
    try {
        await apiCall(`/goals/${id}`, { method: 'DELETE' });
        await loadGoals();
        showNotification('删除成功', 'success');
    } catch (error) {
        showNotification('删除失败', 'error');
    }
}

async function deleteGoalRecord(goalId, recordId) {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
        await apiCall(`/goals/${goalId}/records/${recordId}`, { method: 'DELETE' });
        await loadGoals();
        showNotification('删除成功', 'success');
    } catch (error) {
        showNotification('删除失败', 'error');
    }
}

function openEditGoalModal(goal) {
    AppState.editingGoalId = goal.id;
    document.getElementById('goalModalTitle').textContent = '编辑目标';
    document.getElementById('goalTitle').value = goal.title || '';
    document.getElementById('goalVision').value = goal.vision || '';
    document.getElementById('goalCategory').value = goal.category || '';
    document.getElementById('goalStatus').value = goal.status || 'active';
    document.getElementById('goalStartDate').value = toDateInputValue(goal.startDate);
    document.getElementById('goalTargetDate').value = toDateInputValue(goal.targetDate);
    document.getElementById('goalProgress').value = goal.progress || 0;
    document.getElementById('goalTags').value = goal.tags ? goal.tags.join(', ') : '';
    goalModal.classList.add('show');
}

function openGoalRecordModal(goal, record = null) {
    AppState.goalRecordTargetId = goal.id;
    AppState.editingGoalRecordId = record ? record.id : null;
    document.getElementById('goalRecordGoalName').textContent = goal.title || '';
    document.getElementById('goalRecordModalTitle').textContent = record ? '编辑记录' : '添加记录';
    document.getElementById('goalRecordTitle').value = record?.title || '';
    document.getElementById('goalRecordContent').value = record?.content || '';
    document.getElementById('goalRecordType').value = record?.type || 'inspiration';
    document.getElementById('goalRecordDate').value = toDateInputValue(record?.date || new Date());
    document.getElementById('goalRecordTags').value = record?.tags ? record.tags.join(', ') : '';
    goalRecordModal.classList.add('show');
}

// ==================== Modal Handlers ====================
const noteModal = document.getElementById('noteModal');
const ideaModal = document.getElementById('ideaModal');
const diaryModal = document.getElementById('diaryModal');
const goalModal = document.getElementById('goalModal');
const goalRecordModal = document.getElementById('goalRecordModal');
const settingsModal = document.getElementById('settingsModal');

// Close modal handlers
document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
        noteModal.classList.remove('show');
        ideaModal.classList.remove('show');
        diaryModal?.classList.remove('show');
        goalModal?.classList.remove('show');
        goalRecordModal?.classList.remove('show');
        settingsModal.classList.remove('show');
    });
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', () => {
        noteModal.classList.remove('show');
        ideaModal.classList.remove('show');
        diaryModal?.classList.remove('show');
        goalModal?.classList.remove('show');
        goalRecordModal?.classList.remove('show');
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

// Add Diary Modal
document.getElementById('addDiaryBtn')?.addEventListener('click', () => {
    AppState.editingDiaryId = null;
    document.getElementById('diaryModalTitle').textContent = '写日记';
    document.getElementById('diaryForm').reset();
    document.getElementById('diaryDate').value = formatDateKey(new Date());
    diaryModal.classList.add('show');
});

// Add Goal Modal
document.getElementById('addGoalBtn')?.addEventListener('click', () => {
    AppState.editingGoalId = null;
    document.getElementById('goalModalTitle').textContent = '新建目标';
    document.getElementById('goalForm').reset();
    document.getElementById('goalProgress').value = 0;
    goalModal.classList.add('show');
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

// Diary Form Submit
document.getElementById('diaryForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('diaryContent').value.trim();

    if (!content) return showNotification('内容不能为空', 'error');

    const diaryData = {
        title: document.getElementById('diaryTitle').value.trim(),
        content,
        mood: document.getElementById('diaryMood').value,
        weather: document.getElementById('diaryWeather').value.trim(),
        tags: document.getElementById('diaryTags').value.split(',').map(t => t.trim()).filter(t => t),
        entryDate: document.getElementById('diaryDate').value ? new Date(document.getElementById('diaryDate').value).toISOString() : null
    };

    try {
        if (AppState.editingDiaryId) {
            await apiCall(`/diaries/${AppState.editingDiaryId}`, { method: 'PUT', body: JSON.stringify(diaryData) });
            showNotification('更新成功', 'success');
        } else {
            await apiCall('/diaries', { method: 'POST', body: JSON.stringify(diaryData) });
            showNotification('记录成功', 'success');
        }
        diaryModal.classList.remove('show');
        await loadDiaries();
    } catch (error) {
        showNotification(error.error || '保存失败', 'error');
    }
});

// Goal Form Submit
document.getElementById('goalForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('goalTitle').value.trim();

    if (!title) return showNotification('目标名称不能为空', 'error');

    const goalData = {
        title,
        vision: document.getElementById('goalVision').value.trim(),
        category: document.getElementById('goalCategory').value.trim(),
        status: document.getElementById('goalStatus').value,
        startDate: document.getElementById('goalStartDate').value || null,
        targetDate: document.getElementById('goalTargetDate').value || null,
        progress: document.getElementById('goalProgress').value,
        tags: document.getElementById('goalTags').value.split(',').map(t => t.trim()).filter(t => t)
    };

    try {
        if (AppState.editingGoalId) {
            await apiCall(`/goals/${AppState.editingGoalId}`, { method: 'PUT', body: JSON.stringify(goalData) });
            showNotification('更新成功', 'success');
        } else {
            await apiCall('/goals', { method: 'POST', body: JSON.stringify(goalData) });
            showNotification('创建成功', 'success');
        }
        goalModal.classList.remove('show');
        await loadGoals();
    } catch (error) {
        showNotification(error.error || '保存失败', 'error');
    }
});

// Goal Record Form Submit
document.getElementById('goalRecordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!AppState.goalRecordTargetId) return;

    const content = document.getElementById('goalRecordContent').value.trim();
    if (!content) return showNotification('内容不能为空', 'error');

    const recordData = {
        title: document.getElementById('goalRecordTitle').value.trim(),
        content,
        type: document.getElementById('goalRecordType').value,
        date: document.getElementById('goalRecordDate').value || null,
        tags: document.getElementById('goalRecordTags').value.split(',').map(t => t.trim()).filter(t => t)
    };

    try {
        if (AppState.editingGoalRecordId) {
            await apiCall(`/goals/${AppState.goalRecordTargetId}/records/${AppState.editingGoalRecordId}`, { method: 'PUT', body: JSON.stringify(recordData) });
            showNotification('更新成功', 'success');
        } else {
            await apiCall(`/goals/${AppState.goalRecordTargetId}/records`, { method: 'POST', body: JSON.stringify(recordData) });
            showNotification('记录成功', 'success');
        }
        goalRecordModal.classList.remove('show');
        AppState.editingGoalRecordId = null;
        AppState.goalRecordTargetId = null;
        await loadGoals();
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

// Diaries filters
document.getElementById('diarySearchInput')?.addEventListener('input', (e) => {
    AppState.diarySearchQuery = e.target.value;
    AppState.diaryCurrentPage = 1;
    renderDiaries();
});

document.getElementById('diaryMoodFilter')?.addEventListener('change', (e) => {
    AppState.diaryMood = e.target.value;
    AppState.diaryCurrentPage = 1;
    renderDiaries();
});

document.getElementById('diaryRangeFilter')?.addEventListener('change', (e) => {
    AppState.diaryRange = e.target.value;
    AppState.diaryCurrentPage = 1;
    renderDiaries();
});

document.getElementById('diarySortSelect')?.addEventListener('change', (e) => {
    AppState.diarySort = e.target.value;
    renderDiaries();
});

document.getElementById('diaryPerPageSelect')?.addEventListener('change', (e) => {
    AppState.diaryPerPage = parseInt(e.target.value);
    AppState.diaryCurrentPage = 1;
    renderDiaries();
});

document.getElementById('diaryPrevPage')?.addEventListener('click', () => {
    if (AppState.diaryCurrentPage > 1) {
        AppState.diaryCurrentPage--;
        renderDiaries();
    }
});

document.getElementById('diaryNextPage')?.addEventListener('click', () => {
    const { totalPages } = getPaginatedDiaries();
    if (AppState.diaryCurrentPage < totalPages) {
        AppState.diaryCurrentPage++;
        renderDiaries();
    }
});

// Goals filters
document.getElementById('goalSearchInput')?.addEventListener('input', (e) => {
    AppState.goalSearchQuery = e.target.value;
    renderGoals();
});

document.getElementById('goalStatusFilter')?.addEventListener('change', (e) => {
    AppState.goalStatus = e.target.value;
    renderGoals();
});

document.getElementById('goalRecordTypeFilter')?.addEventListener('change', (e) => {
    AppState.goalRecordType = e.target.value;
    renderGoals();
});

document.getElementById('goalSortSelect')?.addEventListener('change', (e) => {
    AppState.goalSort = e.target.value;
    renderGoals();
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

    // 本月洞察
    const monthTotal = monthNotes.length + monthIdeas.length;
    const activeDaySet = new Set();
    monthNotes.forEach(n => activeDaySet.add(formatDateKey(new Date(n.createdAt))));
    monthIdeas.forEach(i => activeDaySet.add(formatDateKey(new Date(i.createdAt))));
    const activeDays = activeDaySet.size;
    const daysElapsed = today.getDate();
    const avgActivity = daysElapsed > 0 ? (monthTotal / daysElapsed) : 0;
    const avgActivityDisplay = avgActivity.toFixed(1).replace(/\.0$/, '');
    const completionRate = monthNotes.length > 0
        ? Math.round((monthCompleted.length / monthNotes.length) * 100)
        : 0;
    const ideaRate = daysElapsed > 0
        ? Math.round((monthIdeas.length / daysElapsed) * 100)
        : 0;
    const ideaRateWidth = Math.min(100, ideaRate);

    const monthActiveDaysEl = document.getElementById('monthActiveDays');
    const monthAvgActivityEl = document.getElementById('monthAvgActivity');
    const monthTotalNotesEl = document.getElementById('monthTotalNotes');
    const monthTotalIdeasEl = document.getElementById('monthTotalIdeas');
    const monthCompletionRateEl = document.getElementById('monthCompletionRate');
    const monthIdeaRateEl = document.getElementById('monthIdeaRate');
    const monthCompletionBarEl = document.getElementById('monthCompletionBar');
    const monthIdeaBarEl = document.getElementById('monthIdeaBar');

    if (monthActiveDaysEl) monthActiveDaysEl.textContent = activeDays;
    if (monthAvgActivityEl) monthAvgActivityEl.textContent = avgActivityDisplay;
    if (monthTotalNotesEl) monthTotalNotesEl.textContent = monthNotes.length;
    if (monthTotalIdeasEl) monthTotalIdeasEl.textContent = monthIdeas.length;
    if (monthCompletionRateEl) monthCompletionRateEl.textContent = completionRate + '%';
    if (monthIdeaRateEl) monthIdeaRateEl.textContent = ideaRate + '%';
    if (monthCompletionBarEl) monthCompletionBarEl.style.width = completionRate + '%';
    if (monthIdeaBarEl) monthIdeaBarEl.style.width = ideaRateWidth + '%';

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

    const hash = window.location.hash.replace('#', '');
    const validPages = ['notes', 'ideas', 'diary', 'goals', 'timeline'];
    const page = validPages.includes(hash) ? hash : 'notes';
    switchPage(page);
}

init();
setInterval(() => {
    const page = AppState.activePage;
    if (page === 'notes') {
        loadNotes();
    } else if (page === 'ideas') {
        loadIdeas();
    } else if (page === 'diary') {
        loadDiaries();
    } else if (page === 'goals') {
        loadGoals();
    } else if (page === 'timeline') {
        loadTimeline();
    }
}, 60000);
console.log('智能笔记系统已加载完成 v3.0');
