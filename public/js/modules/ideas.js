/**
 * Ideas 模块 - 想法记录管理
 */

import { apiCall, downloadFile } from './api.js';
import { IdeasState } from './state.js';
import { escapeHtml, formatRelativeDate, renderMarkdown, debounce } from './utils.js';
import { showNotification, openModal, closeModal, resetColorPicker, setColorPickerValue, confirm } from './ui.js';

// ==================== 数据加载 ====================
export async function loadIdeas() {
    try {
        IdeasState.allIdeas = await apiCall('/ideas');
        updateIdeaCategoryFilter();
        renderIdeas();
        updateIdeasStats();
    } catch (error) {
        console.error('Error loading ideas:', error);
        showNotification('加载想法失败', 'error');
    }
}

// ==================== 统计更新 ====================
export function updateIdeasStats() {
    const total = IdeasState.allIdeas.length;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = IdeasState.allIdeas.filter(i => new Date(i.createdAt) >= weekAgo).length;

    const totalEl = document.getElementById('ideasTotalCount');
    const weekEl = document.getElementById('ideasThisWeek');

    if (totalEl) totalEl.textContent = total;
    if (weekEl) weekEl.textContent = thisWeek;
}

// ==================== 分类过滤器更新 ====================
export function updateIdeaCategoryFilter() {
    const categories = [...new Set(IdeasState.allIdeas.map(i => i.category).filter(Boolean))];
    const select = document.getElementById('ideaCategoryFilter');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">所有分类</option>';
    categories.forEach(cat => {
        select.innerHTML += `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`;
    });

    if (categories.includes(currentValue)) {
        select.value = currentValue;
    }

    // 更新新建想法的分类建议
    const datalist = document.getElementById('ideaCategoryList');
    if (datalist) {
        const defaultCats = ['灵感', '学习', '工作', '生活', '技术', '产品'];
        const allCats = [...new Set([...defaultCats, ...categories])];
        datalist.innerHTML = allCats.map(cat => `<option value="${escapeHtml(cat)}">`).join('');
    }
}

// ==================== 筛选和排序 ====================
export function getFilteredIdeas() {
    let filtered = [...IdeasState.allIdeas];

    // 分类筛选
    if (IdeasState.category) {
        filtered = filtered.filter(i => i.category === IdeasState.category);
    }

    // 搜索筛选
    if (IdeasState.searchQuery) {
        const q = IdeasState.searchQuery.toLowerCase();
        filtered = filtered.filter(i =>
            i.title.toLowerCase().includes(q) ||
            i.content.toLowerCase().includes(q) ||
            (i.tags && i.tags.some(tag => tag.toLowerCase().includes(q)))
        );
    }

    // 排序
    filtered.sort((a, b) => {
        switch (IdeasState.sort) {
            case 'newest':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'oldest':
                return new Date(a.createdAt) - new Date(b.createdAt);
            default:
                return 0;
        }
    });

    return filtered;
}

export function getPaginatedIdeas() {
    const filtered = getFilteredIdeas();
    const totalPages = Math.ceil(filtered.length / IdeasState.perPage) || 1;

    if (IdeasState.currentPage > totalPages) IdeasState.currentPage = totalPages;
    if (IdeasState.currentPage < 1) IdeasState.currentPage = 1;

    const start = (IdeasState.currentPage - 1) * IdeasState.perPage;
    return {
        ideas: filtered.slice(start, start + IdeasState.perPage),
        totalIdeas: filtered.length,
        totalPages
    };
}

// ==================== 渲染 ====================
export function renderIdeas() {
    const container = document.getElementById('ideasContainer');
    const emptyState = document.getElementById('ideasEmptyState');
    const paginationContainer = document.getElementById('ideasPaginationContainer');

    if (!container) return;

    const { ideas, totalIdeas, totalPages } = getPaginatedIdeas();

    if (totalIdeas === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        if (paginationContainer) paginationContainer.style.display = 'none';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (paginationContainer) {
        paginationContainer.style.display = totalIdeas > IdeasState.perPage ? 'flex' : 'none';
    }

    // 更新分页信息
    if (totalIdeas > IdeasState.perPage) {
        const pageInfo = document.getElementById('ideasPageInfo');
        const prevBtn = document.getElementById('ideasPrevPage');
        const nextBtn = document.getElementById('ideasNextPage');

        if (pageInfo) pageInfo.textContent = `第 ${IdeasState.currentPage} / ${totalPages} 页`;
        if (prevBtn) prevBtn.disabled = IdeasState.currentPage === 1;
        if (nextBtn) nextBtn.disabled = IdeasState.currentPage === totalPages;
    }

    container.innerHTML = ideas.map(createIdeaCard).join('');

    // 绑定事件
    ideas.forEach(idea => {
        document.getElementById(`edit-idea-${idea.id}`)?.addEventListener('click', () => openEditIdeaModal(idea));
        document.getElementById(`delete-idea-${idea.id}`)?.addEventListener('click', () => deleteIdea(idea.id));
    });
}

function createIdeaCard(idea) {
    const colorStyle = idea.color ? `border-left-color: ${idea.color};` : '';

    const tags = idea.tags && idea.tags.length > 0
        ? idea.tags.map(t => `<span class="badge badge-category"><i class="fas fa-tag"></i> ${escapeHtml(t)}</span>`).join('')
        : '';

    const categoryBadge = idea.category
        ? `<span class="badge badge-category"><i class="fas fa-layer-group"></i> ${escapeHtml(idea.category)}</span>`
        : '';

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

// ==================== CRUD 操作 ====================
export async function deleteIdea(id) {
    if (!confirm('确定要删除这个想法吗？')) return;
    try {
        await apiCall(`/ideas/${id}`, 'DELETE');
        await loadIdeas();
        showNotification('删除成功', 'success');
    } catch (error) {
        showNotification('删除失败', 'error');
    }
}

// ==================== Modal 操作 ====================
export function openAddIdeaModal() {
    IdeasState.editingIdeaId = null;
    IdeasState.selectedColor = null;

    document.getElementById('ideaModalTitle').textContent = '记录想法';
    document.getElementById('ideaForm').reset();
    resetColorPicker('ideaColorPicker', 'ideaColor');

    openModal('idea');
}

export function openEditIdeaModal(idea) {
    IdeasState.editingIdeaId = idea.id;

    document.getElementById('ideaModalTitle').textContent = '编辑想法';
    document.getElementById('ideaTitle').value = idea.title;
    document.getElementById('ideaContent').value = idea.content || '';
    document.getElementById('ideaCategory').value = idea.category || '灵感';
    document.getElementById('ideaTags').value = idea.tags ? idea.tags.join(', ') : '';

    setColorPickerValue('ideaColorPicker', 'ideaColor', idea.color);
    IdeasState.selectedColor = idea.color || null;

    openModal('idea');
}

export async function handleIdeaFormSubmit(e) {
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
        color: IdeasState.selectedColor
    };

    try {
        if (IdeasState.editingIdeaId) {
            await apiCall(`/ideas/${IdeasState.editingIdeaId}`, 'PUT', ideaData);
            showNotification('更新成功', 'success');
        } else {
            await apiCall('/ideas', 'POST', ideaData);
            showNotification('想法已记录', 'success');
        }
        closeModal('idea');
        await loadIdeas();
    } catch (error) {
        showNotification(error.message || '保存失败', 'error');
    }
}

// ==================== 导出 ====================
export async function exportIdeas() {
    try {
        const filename = `ideas_${new Date().toISOString().split('T')[0]}.json`;
        await downloadFile('/ideas/export/json', filename);
        showNotification('导出成功', 'success');
    } catch (error) {
        showNotification('导出失败', 'error');
    }
}

// ==================== 随机灵感卡片 ====================
export function showRandomIdea() {
    if (IdeasState.allIdeas.length === 0) {
        showNotification('还没有记录任何灵感', 'info');
        return;
    }

    const randomIndex = Math.floor(Math.random() * IdeasState.allIdeas.length);
    const idea = IdeasState.allIdeas[randomIndex];

    const modal = document.getElementById('randomIdeaModal');
    if (!modal) return;

    // 填充随机灵感内容
    const colorStyle = idea.color ? `border-left: 4px solid ${idea.color};` : '';
    const tagsHtml = idea.tags && idea.tags.length > 0
        ? `<div class="random-idea-tags">${idea.tags.map(t => `<span class="tag"><i class="fas fa-tag"></i> ${escapeHtml(t)}</span>`).join('')}</div>`
        : '';

    document.getElementById('randomIdeaContent').innerHTML = `
        <div class="random-idea-card" style="${colorStyle}">
            <div class="random-idea-header">
                <span class="random-idea-category"><i class="fas fa-lightbulb"></i> ${escapeHtml(idea.category || '灵感')}</span>
                <span class="random-idea-date">${formatRelativeDate(idea.createdAt)}</span>
            </div>
            <h3 class="random-idea-title">${escapeHtml(idea.title)}</h3>
            <div class="random-idea-body">${renderMarkdown(idea.content)}</div>
            ${tagsHtml}
        </div>
    `;

    modal.classList.add('show');
}

export function closeRandomIdeaModal() {
    const modal = document.getElementById('randomIdeaModal');
    if (modal) modal.classList.remove('show');
}

export function reshuffleIdea() {
    showRandomIdea();
}

// ==================== 事件绑定 ====================
export function initIdeasEvents() {
    // 搜索（带防抖）
    const searchInput = document.getElementById('ideaSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            IdeasState.searchQuery = e.target.value;
            IdeasState.currentPage = 1;
            renderIdeas();
        }, 300));
    }

    // 分类筛选
    document.getElementById('ideaCategoryFilter')?.addEventListener('change', (e) => {
        IdeasState.category = e.target.value;
        IdeasState.currentPage = 1;
        renderIdeas();
    });

    // 排序
    document.getElementById('ideaSortSelect')?.addEventListener('change', (e) => {
        IdeasState.sort = e.target.value;
        renderIdeas();
    });

    // 每页数量
    document.getElementById('ideasPerPageSelect')?.addEventListener('change', (e) => {
        IdeasState.perPage = parseInt(e.target.value);
        IdeasState.currentPage = 1;
        renderIdeas();
    });

    // 分页
    document.getElementById('ideasPrevPage')?.addEventListener('click', () => {
        if (IdeasState.currentPage > 1) {
            IdeasState.currentPage--;
            renderIdeas();
        }
    });

    document.getElementById('ideasNextPage')?.addEventListener('click', () => {
        const { totalPages } = getPaginatedIdeas();
        if (IdeasState.currentPage < totalPages) {
            IdeasState.currentPage++;
            renderIdeas();
        }
    });

    // 添加按钮
    document.getElementById('addIdeaBtn')?.addEventListener('click', openAddIdeaModal);

    // 表单提交
    document.getElementById('ideaForm')?.addEventListener('submit', handleIdeaFormSubmit);

    // 导出
    document.getElementById('exportIdeasBtn')?.addEventListener('click', exportIdeas);

    // 颜色选择器
    const colorPicker = document.getElementById('ideaColorPicker');
    if (colorPicker) {
        colorPicker.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', () => {
                colorPicker.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                IdeasState.selectedColor = option.dataset.color || null;
                document.getElementById('ideaColor').value = IdeasState.selectedColor || '';
            });
        });
    }

    // 随机灵感按钮
    document.getElementById('randomIdeaBtn')?.addEventListener('click', showRandomIdea);

    // 随机灵感 Modal 事件
    document.getElementById('closeRandomIdeaBtn')?.addEventListener('click', closeRandomIdeaModal);
    document.getElementById('reshuffleIdeaBtn')?.addEventListener('click', reshuffleIdea);

    // 点击 modal 背景关闭
    document.getElementById('randomIdeaModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'randomIdeaModal') {
            closeRandomIdeaModal();
        }
    });
}
