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
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');
if (!token) window.location.href = '/';

document.getElementById('userEmail').textContent = user.email || '';

// ==================== API Helper ====================
async function apiCall(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    });
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
        return;
    }
    return response.json();
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
        const titles = { notes: '待办清单', ideas: '想法记录' };
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
document.getElementById('settingsBtn').addEventListener('click', () => {
    settingsModal.classList.add('show');
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
