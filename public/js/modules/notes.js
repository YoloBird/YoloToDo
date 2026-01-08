/**
 * Notes 模块 - 待办事项管理
 */

import { apiCall, downloadFile } from './api.js';
import { NotesState } from './state.js';
import { escapeHtml, formatDate, formatDateTimeLocal, renderMarkdown, debounce } from './utils.js';
import { showNotification, openModal, closeModal, resetColorPicker, setColorPickerValue, confirm } from './ui.js';
import { loadMatrixData, renderMatrix, MatrixState, getMatrixStats } from './matrix.js';

// ==================== 数据加载 ====================
export async function loadNotes() {
    try {
        NotesState.allNotes = await apiCall('/notes');
        updateCategoryFilter();
        renderNotes();
        updateNotesStats();

        // 加载优先级矩阵数据
        await loadMatrixData();

        // 更新四象限卡片计数
        updateQuadrantCounts();

        // 渲染完整矩阵视图
        renderMatrix('fullMatrixContainer', {
            compact: false,
            onNoteClick: handleMatrixNoteClick
        });
    } catch (error) {
        console.error('Error loading notes:', error);
        showNotification('加载失败', 'error');
    }
}

// 矩阵中点击便签时的回调
function handleMatrixNoteClick(note) {
    // 滚动到对应的便签卡片并高亮
    const noteCard = document.querySelector(`[data-note-id="${note.id}"]`);
    if (noteCard) {
        noteCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        noteCard.classList.add('highlight');
        setTimeout(() => noteCard.classList.remove('highlight'), 2000);
    }
}

export async function loadArchivedNotes() {
    try {
        NotesState.archivedNotes = await apiCall('/notes/archived');
        renderNotes();
        updateNotesStats();
    } catch (error) {
        console.error('Error loading archived notes:', error);
        showNotification('加载归档便签失败', 'error');
    }
}

// ==================== 统计更新 ====================
export function updateNotesStats() {
    const total = NotesState.allNotes.length;
    const completed = NotesState.allNotes.filter(n => n.completed).length;
    const archived = NotesState.archivedNotes.length;

    const totalEl = document.getElementById('totalCount');
    const completedEl = document.getElementById('completedCount');
    const pendingEl = document.getElementById('pendingCount');
    const archivedEl = document.getElementById('archivedCount');

    if (totalEl) totalEl.textContent = total;
    if (completedEl) completedEl.textContent = completed;
    if (pendingEl) pendingEl.textContent = total - completed;
    if (archivedEl) archivedEl.textContent = archived;
}

// ==================== 分类过滤器更新 ====================
export function updateCategoryFilter() {
    const categorySelect = document.getElementById('categoryFilterSelect');
    if (!categorySelect) return;

    const categories = [...new Set(
        NotesState.allNotes.filter(n => n.category).map(n => n.category)
    )];

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

// ==================== 筛选和排序 ====================
export function getFilteredNotes() {
    // 根据视图模式选择数据源
    let filtered = NotesState.viewMode === 'archived'
        ? [...NotesState.archivedNotes]
        : [...NotesState.allNotes];

    // 归档视图不需要状态筛选
    if (NotesState.viewMode !== 'archived') {
        // 象限筛选（优先于其他筛选）
        if (NotesState.activeQuadrant && MatrixState.quadrants) {
            const quadrantNotes = MatrixState.quadrants[NotesState.activeQuadrant] || [];
            const quadrantIds = new Set(quadrantNotes.map(n => n.id));
            filtered = filtered.filter(n => quadrantIds.has(n.id));
        } else {
            // 状态筛选
            switch (NotesState.currentFilter) {
                case 'active':
                    filtered = filtered.filter(n => !n.completed);
                    break;
                case 'completed':
                    filtered = filtered.filter(n => n.completed);
                    break;
                case 'important':
                    filtered = filtered.filter(n => n.isImportant);
                    break;
                case 'today':
                    const today = new Date().toDateString();
                    filtered = filtered.filter(n => new Date(n.createdAt).toDateString() === today);
                    break;
            }
        }

        // 分类筛选
        if (NotesState.currentCategory) {
            filtered = filtered.filter(n => n.category === NotesState.currentCategory);
        }
    }

    // 搜索筛选
    if (NotesState.searchQuery) {
        const q = NotesState.searchQuery.toLowerCase();
        filtered = filtered.filter(n =>
            n.title.toLowerCase().includes(q) ||
            (n.content && n.content.toLowerCase().includes(q)) ||
            (n.category && n.category.toLowerCase().includes(q)) ||
            (n.tags && n.tags.some(tag => tag.toLowerCase().includes(q)))
        );
    }

    // 排序
    filtered.sort((a, b) => {
        switch (NotesState.currentSort) {
            case 'newest':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'oldest':
                return new Date(a.createdAt) - new Date(b.createdAt);
            case 'priority':
                const order = { high: 3, medium: 2, low: 1 };
                return (order[b.priority] || 0) - (order[a.priority] || 0);
            case 'dueDate':
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            default:
                return 0;
        }
    });

    return filtered;
}

export function getPaginatedNotes() {
    const filtered = getFilteredNotes();
    const totalPages = Math.ceil(filtered.length / NotesState.perPage) || 1;

    if (NotesState.currentPage > totalPages) NotesState.currentPage = totalPages;
    if (NotesState.currentPage < 1) NotesState.currentPage = 1;

    const start = (NotesState.currentPage - 1) * NotesState.perPage;
    return {
        notes: filtered.slice(start, start + NotesState.perPage),
        totalNotes: filtered.length,
        totalPages
    };
}

// ==================== 渲染 ====================
export function renderNotes() {
    const container = document.getElementById('notesContainer');
    const emptyState = document.getElementById('emptyState');
    const paginationContainer = document.getElementById('paginationContainer');

    if (!container) return;

    const { notes, totalNotes, totalPages } = getPaginatedNotes();

    if (totalNotes === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        if (paginationContainer) paginationContainer.style.display = 'none';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (paginationContainer) {
        paginationContainer.style.display = totalNotes > NotesState.perPage ? 'flex' : 'none';
    }

    // 更新分页信息
    if (totalNotes > NotesState.perPage) {
        const pageInfo = document.getElementById('pageInfo');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        if (pageInfo) pageInfo.textContent = `第 ${NotesState.currentPage} / ${totalPages} 页`;
        if (prevBtn) prevBtn.disabled = NotesState.currentPage === 1;
        if (nextBtn) nextBtn.disabled = NotesState.currentPage === totalPages;
    }

    container.innerHTML = notes.map(note => createNoteCard(note, NotesState.viewMode === 'archived')).join('');

    // 绑定事件
    notes.forEach(note => {
        if (NotesState.viewMode === 'archived') {
            // 归档视图：恢复和永久删除
            document.getElementById(`unarchive-${note.id}`)?.addEventListener('click', () => unarchiveNote(note.id));
            document.getElementById(`delete-${note.id}`)?.addEventListener('click', () => deleteNote(note.id, true));
        } else {
            // 普通视图：完成、编辑、归档
            document.getElementById(`complete-${note.id}`)?.addEventListener('click', () => toggleComplete(note.id));
            document.getElementById(`edit-${note.id}`)?.addEventListener('click', () => openEditNoteModal(note));
            document.getElementById(`archive-${note.id}`)?.addEventListener('click', () => archiveNote(note.id));
            document.getElementById(`delete-${note.id}`)?.addEventListener('click', () => deleteNote(note.id));
        }

        // 子任务勾选事件
        if (note.subtasks && note.subtasks.length > 0) {
            const subtasksContainer = document.querySelector(`.note-subtasks[data-note-id="${note.id}"]`);
            if (subtasksContainer) {
                // 勾选事件（包括隐藏区域）
                subtasksContainer.querySelectorAll('.subtask-item input[type="checkbox"]').forEach(checkbox => {
                    checkbox.addEventListener('change', () => {
                        const subtaskItem = checkbox.closest('.subtask-item');
                        const subtaskId = subtaskItem.dataset.subtaskId;
                        toggleSubtask(note.id, subtaskId);
                    });
                });

                // 展开/折叠按钮事件
                const toggleBtn = subtasksContainer.querySelector('.subtasks-toggle-btn');
                const collapsedSection = subtasksContainer.querySelector('.subtasks-collapsed');
                if (toggleBtn && collapsedSection) {
                    toggleBtn.addEventListener('click', () => {
                        const isExpanded = toggleBtn.dataset.expanded === 'true';
                        if (isExpanded) {
                            collapsedSection.style.display = 'none';
                            toggleBtn.dataset.expanded = 'false';
                            toggleBtn.innerHTML = `<i class="fas fa-chevron-down"></i><span>展开剩余 ${collapsedSection.querySelectorAll('.subtask-item').length} 项</span>`;
                        } else {
                            collapsedSection.style.display = 'block';
                            toggleBtn.dataset.expanded = 'true';
                            toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i><span>收起</span>';
                        }
                    });
                }
            }
        }
    });
}

function createNoteCard(note, isArchived = false) {
    const completedClass = note.completed ? 'completed' : '';
    const archivedClass = isArchived ? 'archived' : '';
    const colorStyle = note.color ? `border-left-color: ${note.color};` : '';
    const importantIcon = note.isImportant ? '<i class="fas fa-star star-icon"></i>' : '';

    const priorityText = { high: '高', medium: '中', low: '低' };
    let badges = '';
    if (note.priority) {
        badges += `<span class="badge badge-priority-${note.priority}"><i class="fas fa-flag"></i> ${priorityText[note.priority]}</span>`;
    }
    if (note.category) {
        badges += `<span class="badge badge-category"><i class="fas fa-folder"></i> ${escapeHtml(note.category)}</span>`;
    }
    if (note.format === 'markdown') {
        badges += '<span class="badge badge-format"><i class="fab fa-markdown"></i> MD</span>';
    }
    if (isArchived) {
        badges += '<span class="badge badge-archived"><i class="fas fa-archive"></i> 已归档</span>';
    }

    const tags = note.tags && note.tags.length > 0
        ? `<div class="note-card-tags">${note.tags.map(t => `<span class="tag"><i class="fas fa-tag"></i> ${escapeHtml(t)}</span>`).join('')}</div>`
        : '';

    let dates = '';
    if (note.dueDate || note.reminderDate || note.archivedAt) {
        dates = '<div class="note-card-dates">';
        if (note.dueDate) {
            dates += `<div><i class="fas fa-calendar-alt"></i> 截止: ${formatDate(note.dueDate)}</div>`;
        }
        if (note.reminderDate) {
            const status = note.reminderSent ? '(已发送)' : '';
            dates += `<div><i class="fas fa-bell"></i> 提醒: ${formatDate(note.reminderDate)} ${status}</div>`;
        }
        if (note.archivedAt) {
            dates += `<div><i class="fas fa-archive"></i> 归档于: ${formatDate(note.archivedAt)}</div>`;
        }
        dates += '</div>';
    }

    let contentHtml = '';
    if (note.content) {
        contentHtml = note.format === 'markdown'
            ? `<div class="note-card-content markdown-body">${renderMarkdown(note.content)}</div>`
            : `<div class="note-card-content">${escapeHtml(note.content)}</div>`;
    }

    // 子任务列表
    let subtasksHtml = '';
    if (note.subtasks && note.subtasks.length > 0) {
        const completedCount = note.subtasks.filter(st => st.completed).length;
        const totalCount = note.subtasks.length;
        const progress = Math.round((completedCount / totalCount) * 100);
        const shouldCollapse = totalCount > 3; // 超过3个子任务时默认折叠
        const visibleSubtasks = shouldCollapse ? note.subtasks.slice(0, 2) : note.subtasks;
        const hiddenSubtasks = shouldCollapse ? note.subtasks.slice(2) : [];

        subtasksHtml = `
            <div class="note-subtasks ${shouldCollapse ? 'collapsible' : ''}" data-note-id="${note.id}">
                <div class="subtasks-header">
                    <span class="subtasks-title"><i class="fas fa-tasks"></i> 子任务</span>
                    <span class="subtasks-progress">${completedCount}/${totalCount}</span>
                </div>
                <div class="subtasks-progress-bar">
                    <div class="subtasks-progress-fill" style="width: ${progress}%"></div>
                </div>
                <ul class="subtasks-list">
                    ${visibleSubtasks.map(st => `
                        <li class="subtask-item ${st.completed ? 'completed' : ''}" data-subtask-id="${st.id}">
                            <label class="subtask-checkbox">
                                <input type="checkbox" ${st.completed ? 'checked' : ''} ${isArchived ? 'disabled' : ''}>
                                <span class="checkmark"></span>
                            </label>
                            <span class="subtask-text">${escapeHtml(st.text)}</span>
                        </li>
                    `).join('')}
                </ul>
                ${shouldCollapse ? `
                    <div class="subtasks-collapsed" style="display: none;">
                        <ul class="subtasks-list">
                            ${hiddenSubtasks.map(st => `
                                <li class="subtask-item ${st.completed ? 'completed' : ''}" data-subtask-id="${st.id}">
                                    <label class="subtask-checkbox">
                                        <input type="checkbox" ${st.completed ? 'checked' : ''} ${isArchived ? 'disabled' : ''}>
                                        <span class="checkmark"></span>
                                    </label>
                                    <span class="subtask-text">${escapeHtml(st.text)}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    <button type="button" class="subtasks-toggle-btn" data-expanded="false">
                        <i class="fas fa-chevron-down"></i>
                        <span>展开剩余 ${hiddenSubtasks.length} 项</span>
                    </button>
                ` : ''}
            </div>
        `;
    }

    // 根据是否归档显示不同的操作按钮
    let actionsHtml = '';
    if (isArchived) {
        actionsHtml = `
            <div class="note-card-actions">
                <button class="note-action-btn unarchive" id="unarchive-${note.id}"><i class="fas fa-undo"></i> 恢复</button>
                <button class="note-action-btn delete" id="delete-${note.id}"><i class="fas fa-trash"></i> 永久删除</button>
            </div>
        `;
    } else {
        const completeText = note.completed ? '取消' : '完成';
        const completeIcon = note.completed ? 'fa-undo' : 'fa-check';
        actionsHtml = `
            <div class="note-card-actions">
                <button class="note-action-btn complete" id="complete-${note.id}"><i class="fas ${completeIcon}"></i> ${completeText}</button>
                <button class="note-action-btn edit" id="edit-${note.id}"><i class="fas fa-edit"></i> 编辑</button>
                <button class="note-action-btn archive" id="archive-${note.id}"><i class="fas fa-archive"></i> 归档</button>
            </div>
        `;
    }

    return `
        <div class="note-card ${completedClass} ${archivedClass}" style="${colorStyle}" data-note-id="${note.id}">
            <div class="note-card-header">
                <div class="note-card-title">${escapeHtml(note.title)}</div>
                <div class="note-card-icons">${importantIcon}</div>
            </div>
            ${contentHtml}
            ${subtasksHtml}
            ${badges ? `<div class="note-card-meta">${badges}</div>` : ''}
            ${tags}
            ${dates}
            ${actionsHtml}
        </div>
    `;
}

// ==================== CRUD 操作 ====================
export async function toggleComplete(id) {
    try {
        await apiCall(`/notes/${id}/toggle`, 'PATCH');
        await loadNotes();
        showNotification('状态已更新', 'success');
    } catch (error) {
        showNotification('操作失败', 'error');
    }
}

export async function toggleSubtask(noteId, subtaskId) {
    try {
        await apiCall(`/notes/${noteId}/subtask/${subtaskId}`, 'PATCH');
        if (NotesState.viewMode === 'archived') {
            await loadArchivedNotes();
        } else {
            await loadNotes();
        }
    } catch (error) {
        showNotification('更新子任务失败', 'error');
    }
}

export async function deleteNote(id, permanent = false) {
    const message = permanent ? '确定要永久删除这个便签吗？此操作不可恢复！' : '确定要删除这个待办吗？';
    if (!confirm(message)) return;
    try {
        await apiCall(`/notes/${id}`, 'DELETE');
        if (NotesState.viewMode === 'archived') {
            await loadArchivedNotes();
        } else {
            await loadNotes();
        }
        showNotification('删除成功', 'success');
    } catch (error) {
        showNotification('删除失败', 'error');
    }
}

export async function archiveNote(id) {
    try {
        await apiCall(`/notes/${id}/archive`, 'POST');
        await loadNotes();
        await loadArchivedNotes();
        showNotification('已归档', 'success');
    } catch (error) {
        showNotification('归档失败', 'error');
    }
}

export async function unarchiveNote(id) {
    try {
        await apiCall(`/notes/${id}/unarchive`, 'POST');
        await loadNotes();
        await loadArchivedNotes();
        showNotification('已恢复', 'success');
    } catch (error) {
        showNotification('恢复失败', 'error');
    }
}

export async function completeAll() {
    if (!confirm('确定要完成所有待办吗？')) return;
    try {
        await apiCall('/notes/complete-all', 'POST');
        await loadNotes();
        showNotification('所有待办已标记为完成', 'success');
    } catch (error) {
        showNotification('操作失败', 'error');
    }
}

// ==================== Modal 操作 ====================
export function openAddNoteModal() {
    NotesState.editingNoteId = null;
    NotesState.selectedColor = null;
    NotesState.subtasks = [];

    document.getElementById('modalTitle').textContent = '新建待办';
    document.getElementById('noteForm').reset();
    resetColorPicker('colorPicker', 'noteColor');
    renderSubtasksEditor();

    openModal('note');
}

export function openEditNoteModal(note) {
    NotesState.editingNoteId = note.id;
    NotesState.subtasks = note.subtasks ? [...note.subtasks] : [];

    document.getElementById('modalTitle').textContent = '编辑待办';
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteContent').value = note.content || '';
    document.getElementById('noteCategory').value = note.category || '';
    document.getElementById('notePriority').value = note.priority;
    document.getElementById('noteTags').value = note.tags ? note.tags.join(', ') : '';
    document.getElementById('noteImportant').checked = note.isImportant || false;

    setColorPickerValue('colorPicker', 'noteColor', note.color);
    NotesState.selectedColor = note.color || null;

    const formatRadio = document.querySelector(`input[name="noteFormat"][value="${note.format || 'text'}"]`);
    if (formatRadio) formatRadio.checked = true;

    document.getElementById('noteDueDate').value = note.dueDate ? formatDateTimeLocal(note.dueDate) : '';
    document.getElementById('noteReminderDate').value = note.reminderDate ? formatDateTimeLocal(note.reminderDate) : '';

    document.querySelectorAll('input[name="reminderMethod"]').forEach(checkbox => {
        checkbox.checked = note.reminderMethods && note.reminderMethods.includes(checkbox.value);
    });

    renderSubtasksEditor();
    openModal('note');
}

// ==================== 子任务编辑器 ====================
export function renderSubtasksEditor() {
    const container = document.getElementById('subtasksEditor');
    if (!container) return;

    container.innerHTML = `
        <div class="subtasks-editor-header">
            <label><i class="fas fa-tasks"></i> 子任务</label>
            <button type="button" class="btn btn-sm btn-ghost" id="addSubtaskBtn">
                <i class="fas fa-plus"></i> 添加
            </button>
        </div>
        <ul class="subtasks-editor-list" id="subtasksEditorList">
            ${NotesState.subtasks.map((st, idx) => `
                <li class="subtask-editor-item" data-index="${idx}">
                    <input type="text" class="subtask-input" value="${escapeHtml(st.text)}" placeholder="子任务内容...">
                    <button type="button" class="subtask-remove-btn" data-index="${idx}">
                        <i class="fas fa-times"></i>
                    </button>
                </li>
            `).join('')}
        </ul>
    `;

    // 绑定添加按钮
    document.getElementById('addSubtaskBtn')?.addEventListener('click', addSubtaskItem);

    // 绑定删除按钮和输入框
    container.querySelectorAll('.subtask-remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            removeSubtaskItem(index);
        });
    });

    container.querySelectorAll('.subtask-input').forEach((input, idx) => {
        input.addEventListener('input', (e) => {
            NotesState.subtasks[idx].text = e.target.value;
        });
    });
}

export function addSubtaskItem() {
    NotesState.subtasks.push({
        id: `new_${Date.now()}_${NotesState.subtasks.length}`,
        text: '',
        completed: false
    });
    renderSubtasksEditor();
    // 聚焦到新添加的输入框
    const inputs = document.querySelectorAll('.subtask-input');
    if (inputs.length > 0) {
        inputs[inputs.length - 1].focus();
    }
}

export function removeSubtaskItem(index) {
    NotesState.subtasks.splice(index, 1);
    renderSubtasksEditor();
}

export async function handleNoteFormSubmit(e) {
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
        color: NotesState.selectedColor,
        subtasks: NotesState.subtasks.filter(st => st.text.trim()).map(st => ({
            id: st.id,
            text: st.text.trim(),
            completed: st.completed || false
        }))
    };

    try {
        if (NotesState.editingNoteId) {
            await apiCall(`/notes/${NotesState.editingNoteId}`, 'PUT', noteData);
            showNotification('更新成功', 'success');
        } else {
            await apiCall('/notes', 'POST', noteData);
            showNotification('创建成功', 'success');
        }
        closeModal('note');
        await loadNotes();
    } catch (error) {
        showNotification(error.message || '保存失败', 'error');
    }
}

// ==================== 导入导出 ====================
export async function exportNotes() {
    try {
        const filename = `notes_${new Date().toISOString().split('T')[0]}.json`;
        await downloadFile('/notes/export/json', filename);
        showNotification('导出成功', 'success');
    } catch (error) {
        showNotification('导出失败', 'error');
    }
}

export async function importNotes(strategy = 'merge') {
    if (!NotesState.importedData) {
        return showNotification('请先选择文件', 'error');
    }

    try {
        const result = await apiCall('/notes/import', 'POST', {
            notes: NotesState.importedData,
            strategy
        });
        showNotification(result.message || '导入成功', 'success');
        document.getElementById('importOptions').style.display = 'none';
        NotesState.importedData = null;
        document.getElementById('importFileInput').value = '';
        closeModal('settings');
        await loadNotes();
    } catch (error) {
        showNotification(error.message || '导入失败', 'error');
    }
}

export function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            NotesState.importedData = JSON.parse(event.target.result);
            document.getElementById('importOptions').style.display = 'block';
            showNotification('文件读取成功，请选择导入策略', 'success');
        } catch (error) {
            showNotification('JSON文件格式错误', 'error');
        }
    };
    reader.readAsText(file);
}

// ==================== 事件绑定 ====================
export function initNotesEvents() {
    // 筛选按钮
    document.querySelectorAll('.pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            NotesState.currentFilter = btn.dataset.filter;
            NotesState.currentPage = 1;
            renderNotes();
        });
    });

    // 搜索（带防抖）
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            NotesState.searchQuery = e.target.value;
            NotesState.currentPage = 1;
            renderNotes();
        }, 300));
    }

    // 排序
    document.getElementById('sortSelect')?.addEventListener('change', (e) => {
        NotesState.currentSort = e.target.value;
        renderNotes();
    });

    // 分类筛选
    document.getElementById('categoryFilterSelect')?.addEventListener('change', (e) => {
        NotesState.currentCategory = e.target.value;
        NotesState.currentPage = 1;
        renderNotes();
    });

    // 每页数量
    document.getElementById('perPageSelect')?.addEventListener('change', (e) => {
        NotesState.perPage = parseInt(e.target.value);
        NotesState.currentPage = 1;
        renderNotes();
    });

    // 分页
    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (NotesState.currentPage > 1) {
            NotesState.currentPage--;
            renderNotes();
        }
    });

    document.getElementById('nextPage')?.addEventListener('click', () => {
        const { totalPages } = getPaginatedNotes();
        if (NotesState.currentPage < totalPages) {
            NotesState.currentPage++;
            renderNotes();
        }
    });

    // 添加按钮
    document.getElementById('addNoteBtn')?.addEventListener('click', openAddNoteModal);

    // 表单提交
    document.getElementById('noteForm')?.addEventListener('submit', handleNoteFormSubmit);

    // 完成全部
    document.getElementById('completeAllBtn')?.addEventListener('click', completeAll);

    // 导出
    document.getElementById('exportBtn')?.addEventListener('click', exportNotes);

    // 导入按钮
    document.getElementById('importBtn')?.addEventListener('click', () => {
        openModal('settings');
        document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.querySelector('.tab-btn[data-tab="data"]')?.classList.add('active');
        document.getElementById('dataTab')?.classList.add('active');
    });

    // 导入文件选择
    document.getElementById('importFileBtn')?.addEventListener('click', () => {
        document.getElementById('importFileInput')?.click();
    });
    document.getElementById('importFileInput')?.addEventListener('change', handleImportFile);

    // 确认导入
    document.getElementById('confirmImportBtn')?.addEventListener('click', () => {
        const strategy = document.querySelector('input[name="importStrategy"]:checked')?.value;
        importNotes(strategy);
    });

    // 颜色选择器
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker) {
        colorPicker.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', () => {
                colorPicker.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                NotesState.selectedColor = option.dataset.color || null;
                document.getElementById('noteColor').value = NotesState.selectedColor || '';
            });
        });
    }

    // 归档视图切换
    document.getElementById('viewArchivedBtn')?.addEventListener('click', () => {
        toggleArchiveView();
    });

    // 视图切换按钮 (列表/矩阵)
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            if (view) switchNotesView(view);
        });
    });

    // 四象限卡片点击筛选
    document.querySelectorAll('.quadrant-card').forEach(card => {
        card.addEventListener('click', () => {
            const quadrant = card.dataset.quadrant;
            if (quadrant) filterByQuadrant(quadrant);
        });
    });
}

// ==================== 视图切换 ====================
export function toggleArchiveView() {
    NotesState.viewMode = NotesState.viewMode === 'archived' ? 'active' : 'archived';
    NotesState.currentPage = 1;

    const btn = document.getElementById('viewArchivedBtn');
    const filterBar = document.querySelector('.filters-bar');
    const pageTitle = document.querySelector('.page-title h1');

    if (NotesState.viewMode === 'archived') {
        if (btn) {
            btn.innerHTML = '<i class="fas fa-list"></i>';
            btn.title = '返回待办';
            btn.classList.add('active');
        }
        if (filterBar) filterBar.style.display = 'none';
        if (pageTitle) pageTitle.innerHTML = '<i class="fas fa-archive"></i> 归档箱';
        loadArchivedNotes();
    } else {
        if (btn) {
            btn.innerHTML = '<i class="fas fa-archive"></i>';
            btn.title = '归档箱';
            btn.classList.remove('active');
        }
        if (filterBar) filterBar.style.display = 'flex';
        if (pageTitle) pageTitle.innerHTML = '<i class="fas fa-clipboard-check"></i> 待办清单';
        loadNotes();
    }
}

// ==================== 四象限卡片和视图切换 ====================

// 更新四象限计数
export function updateQuadrantCounts() {
    const stats = getMatrixStats();

    const q1El = document.getElementById('q1Count');
    const q2El = document.getElementById('q2Count');
    const q3El = document.getElementById('q3Count');
    const q4El = document.getElementById('q4Count');

    if (q1El) q1El.textContent = stats.q1;
    if (q2El) q2El.textContent = stats.q2;
    if (q3El) q3El.textContent = stats.q3;
    if (q4El) q4El.textContent = stats.q4;
}

// 切换列表/矩阵视图
export function switchNotesView(view) {
    NotesState.currentView = view;

    const listView = document.getElementById('notesViewList');
    const matrixView = document.getElementById('notesViewMatrix');
    const viewBtns = document.querySelectorAll('.view-btn');
    const quadrantCards = document.getElementById('quadrantCards');
    const filtersBar = document.querySelector('.filters-bar');

    viewBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    if (view === 'list') {
        if (listView) listView.style.display = 'block';
        if (matrixView) matrixView.style.display = 'none';
        if (quadrantCards) quadrantCards.style.display = 'grid';
        if (filtersBar) filtersBar.style.display = 'flex';
    } else {
        if (listView) listView.style.display = 'none';
        if (matrixView) matrixView.style.display = 'block';
        if (quadrantCards) quadrantCards.style.display = 'none';
        if (filtersBar) filtersBar.style.display = 'none';
    }
}

// 按象限筛选便签
export function filterByQuadrant(quadrant) {
    const quadrantCards = document.querySelectorAll('.quadrant-card');

    // 切换选中状态
    if (NotesState.activeQuadrant === quadrant) {
        // 取消筛选
        NotesState.activeQuadrant = null;
        quadrantCards.forEach(card => card.classList.remove('active'));
    } else {
        // 应用筛选
        NotesState.activeQuadrant = quadrant;
        quadrantCards.forEach(card => {
            card.classList.toggle('active', card.dataset.quadrant === quadrant);
        });
    }

    NotesState.currentPage = 1;
    renderNotes();
}
