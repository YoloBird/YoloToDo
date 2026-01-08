/**
 * Goals 模块 - 长期目标管理
 */

import { apiCall } from './api.js';
import { GoalsState } from './state.js';
import { escapeHtml, formatDateKey, debounce } from './utils.js';
import { showNotification, openModal, closeModal, confirm } from './ui.js';

const STATUS_LABELS = {
    active: '进行中',
    paused: '暂停',
    completed: '已完成'
};

const TYPE_LABELS = {
    inspiration: '灵感',
    insight: '洞察',
    resource: '资料'
};

const TYPE_ICONS = {
    inspiration: 'fa-lightbulb',
    insight: 'fa-brain',
    resource: 'fa-folder-open'
};

const toDateInputValue = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return formatDateKey(date);
};

const formatDateOnly = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

const parseTags = (value) => {
    if (!value) return [];
    return value.split(',').map(tag => tag.trim()).filter(Boolean);
};

const truncateText = (text, length = 120) => {
    if (!text) return '';
    return text.length > length ? `${text.slice(0, length)}...` : text;
};

const RECORD_PREVIEW_LENGTH = 140;

// ==================== 数据加载 ====================
export async function loadGoals() {
    try {
        GoalsState.allGoals = await apiCall('/goals');
        renderGoals();
        updateGoalsStats();
    } catch (error) {
        console.error('Error loading goals:', error);
        showNotification('加载目标失败', 'error');
    }
}

// ==================== 统计更新 ====================
export function updateGoalsStats() {
    const total = GoalsState.allGoals.length;
    const active = GoalsState.allGoals.filter(g => g.status === 'active').length;
    const completed = GoalsState.allGoals.filter(g => g.status === 'completed').length;
    const records = GoalsState.allGoals.reduce((sum, g) => sum + (g.records ? g.records.length : 0), 0);

    const totalEl = document.getElementById('goalsTotalCount');
    const activeEl = document.getElementById('goalsActiveCount');
    const recordEl = document.getElementById('goalsRecordCount');
    const completedEl = document.getElementById('goalsCompletedCount');

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (recordEl) recordEl.textContent = records;
    if (completedEl) completedEl.textContent = completed;
}

// ==================== 筛选和排序 ====================
export function getFilteredGoals() {
    let filtered = [...GoalsState.allGoals];

    if (GoalsState.status) {
        filtered = filtered.filter(g => g.status === GoalsState.status);
    }

    if (GoalsState.searchQuery) {
        const q = GoalsState.searchQuery.toLowerCase();
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
        switch (GoalsState.sort) {
            case 'created':
                return new Date(a.createdAt) - new Date(b.createdAt);
            case 'progress':
                return (b.progress || 0) - (a.progress || 0);
            case 'targetDate':
                if (!a.targetDate) return 1;
                if (!b.targetDate) return -1;
                return new Date(a.targetDate) - new Date(b.targetDate);
            case 'updated':
            default:
                return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
        }
    });

    return filtered;
}

// ==================== 渲染 ====================
export function renderGoals() {
    const container = document.getElementById('goalsContainer');
    const emptyState = document.getElementById('goalsEmptyState');
    if (!container) return;

    const goals = getFilteredGoals();

    if (goals.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        GoalsState.selectedGoalId = null;
        renderGoalDetail(null);
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    updateGoalsListCount(goals.length);

    const selectedGoal = resolveSelectedGoal(goals);

    container.innerHTML = goals
        .map((goal, index) => createGoalListCard(goal, index, selectedGoal && goal.id === selectedGoal.id))
        .join('');

    container.querySelectorAll('.goal-list-card').forEach(card => {
        card.addEventListener('click', () => {
            const goalId = card.dataset.goalId;
            if (!goalId) return;
            GoalsState.selectedGoalId = goalId;
            renderGoals();
        });
    });

    renderGoalDetail(selectedGoal);
}

function updateGoalsListCount(totalGoals) {
    const listCount = document.getElementById('goalsListCount');
    if (!listCount) return;
    listCount.textContent = `共 ${totalGoals} 项`;
}

function resolveSelectedGoal(goals) {
    if (!goals.length) {
        GoalsState.selectedGoalId = null;
        return null;
    }
    const selected = goals.find(goal => String(goal.id) === String(GoalsState.selectedGoalId));
    if (selected) return selected;
    GoalsState.selectedGoalId = goals[0].id;
    return goals[0];
}

function createGoalListCard(goal, index, isSelected) {
    const statusLabel = STATUS_LABELS[goal.status] || '进行中';
    const progress = Math.min(100, Math.max(0, goal.progress || 0));
    const dateRange = goal.startDate || goal.targetDate
        ? `${goal.startDate ? formatDateOnly(goal.startDate) : '未设定'} → ${goal.targetDate ? formatDateOnly(goal.targetDate) : '未设定'}`
        : '未设定时间范围';
    const tags = goal.tags || [];
    const visibleTags = tags.slice(0, 2);
    const extraTags = tags.length - visibleTags.length;
    const tagsHtml = visibleTags.map(tag => `<span>#${escapeHtml(tag)}</span>`).join('');
    const extraTagHtml = extraTags > 0 ? `<span>+${extraTags}</span>` : '';
    const recordCount = (goal.records || []).length;
    const selectedClass = isSelected ? ' is-selected' : '';

    return `
        <div class="goal-list-card${selectedClass}" data-goal-id="${escapeHtml(String(goal.id))}" style="--stagger: ${index}">
            <div class="goal-list-top">
                <span class="goal-status ${escapeHtml(goal.status || 'active')}">
                    <i class="fas fa-circle"></i> ${statusLabel}
                </span>
                <span class="goal-record-count"><i class="fas fa-layer-group"></i> ${recordCount}</span>
            </div>
            <div class="goal-list-title">${escapeHtml(goal.title)}</div>
            ${goal.vision ? `<div class="goal-list-vision">${escapeHtml(goal.vision)}</div>` : ''}
            <div class="goal-list-meta">
                ${goal.category ? `<span><i class="fas fa-folder-open"></i> ${escapeHtml(goal.category)}</span>` : ''}
                <span><i class="fas fa-calendar-alt"></i> ${dateRange}</span>
                ${tagsHtml}
                ${extraTagHtml}
            </div>
            <div class="goal-list-progress">
                <div class="goal-list-progress-bar">
                    <div class="goal-list-progress-fill" style="width: ${progress}%"></div>
                </div>
                <span class="goal-list-progress-value">${progress}%</span>
            </div>
        </div>
    `;
}

function renderGoalDetail(goal) {
    const statusEl = document.getElementById('goalDetailStatus');
    const titleEl = document.getElementById('goalDetailTitle');
    const visionEl = document.getElementById('goalDetailVision');
    const metaEl = document.getElementById('goalDetailMeta');
    const recordLabelEl = document.getElementById('goalDetailRecordLabel');
    const recordsEl = document.getElementById('goalDetailRecords');
    const emptyEl = document.getElementById('goalDetailEmpty');
    const addRecordBtn = document.getElementById('goalDetailAddRecordBtn');
    const editBtn = document.getElementById('goalDetailEditBtn');
    const deleteBtn = document.getElementById('goalDetailDeleteBtn');
    const progressFill = document.getElementById('goalDetailProgressFill');
    const progressLabel = document.getElementById('goalDetailProgressLabel');

    if (!statusEl || !titleEl || !metaEl || !recordsEl || !emptyEl) return;

    if (!goal) {
        statusEl.textContent = '';
        statusEl.className = 'goal-status';
        titleEl.textContent = '请选择目标';
        if (visionEl) visionEl.textContent = '';
        metaEl.innerHTML = '';
        recordsEl.innerHTML = '';
        emptyEl.style.display = 'flex';
        if (addRecordBtn) addRecordBtn.disabled = true;
        if (editBtn) editBtn.disabled = true;
        if (deleteBtn) deleteBtn.disabled = true;
        if (progressFill) progressFill.style.width = '0%';
        if (progressLabel) progressLabel.textContent = '0%';
        return;
    }

    const statusLabel = STATUS_LABELS[goal.status] || '进行中';
    const progress = Math.min(100, Math.max(0, goal.progress || 0));
    const dateRange = goal.startDate || goal.targetDate
        ? `${goal.startDate ? formatDateOnly(goal.startDate) : '未设定'} → ${goal.targetDate ? formatDateOnly(goal.targetDate) : '未设定'}`
        : '未设定时间范围';
    const tags = goal.tags && goal.tags.length > 0
        ? goal.tags.map(tag => `<span class="badge badge-category"><i class="fas fa-tag"></i> ${escapeHtml(tag)}</span>`).join('')
        : '';
    const categoryBadge = goal.category
        ? `<span class="badge badge-category"><i class="fas fa-folder-open"></i> ${escapeHtml(goal.category)}</span>`
        : '';
    const recordCount = (goal.records || []).length;

    statusEl.className = `goal-status ${escapeHtml(goal.status || 'active')}`;
    statusEl.innerHTML = `<i class="fas fa-circle"></i> ${statusLabel}`;
    titleEl.textContent = goal.title || '';
    if (visionEl) visionEl.textContent = goal.vision || '';

    metaEl.innerHTML = `
        ${categoryBadge}
        ${tags}
        <span class="goal-dates"><i class="fas fa-calendar-alt"></i> ${dateRange}</span>
        <span class="badge badge-category"><i class="fas fa-layer-group"></i> ${recordCount} 条记录</span>
    `;

    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressLabel) progressLabel.textContent = `${progress}%`;

    const recordType = GoalsState.recordType;
    const recordLabel = recordType ? `${TYPE_LABELS[recordType] || '记录'}记录` : '全部记录';
    if (recordLabelEl) recordLabelEl.textContent = recordLabel;

    const records = goal.records || [];
    const visibleRecords = recordType ? records.filter(record => record.type === recordType) : records;
    const sortedRecords = visibleRecords
        .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    if (sortedRecords.length === 0) {
        recordsEl.innerHTML = `<div class="goal-record-empty">${recordType ? '当前筛选下暂无记录' : '还没有记录，先添加一条灵感或资料'}</div>`;
    } else {
        recordsEl.innerHTML = sortedRecords.map(record => createGoalRecordItem(goal.id, record)).join('');
    }

    emptyEl.style.display = 'none';

    if (addRecordBtn) {
        addRecordBtn.disabled = false;
        addRecordBtn.onclick = () => openRecordModal(goal);
    }
    if (editBtn) {
        editBtn.disabled = false;
        editBtn.onclick = () => openEditGoalModal(goal);
    }
    if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.onclick = () => deleteGoal(goal.id);
    }

    sortedRecords.forEach(record => {
        document.getElementById(`edit-record-${goal.id}-${record.id}`)?.addEventListener('click', () => openRecordModal(goal, record));
        document.getElementById(`delete-record-${goal.id}-${record.id}`)?.addEventListener('click', () => deleteGoalRecord(goal.id, record.id));
    });

    recordsEl.querySelectorAll('.goal-record-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const goalId = toggle.dataset.goalId;
            const recordId = toggle.dataset.recordId;
            if (!goalId || !recordId) return;
            toggleGoalRecord(goalId, recordId);
        });
    });
}

function getGoalRecord(goalId, recordId) {
    const goal = GoalsState.allGoals.find(item => String(item.id) === String(goalId));
    if (!goal) return null;
    return (goal.records || []).find(record => String(record.id) === String(recordId));
}

function toggleGoalRecord(goalId, recordId) {
    const item = document.querySelector(`.goal-record-item[data-goal-id="${goalId}"][data-record-id="${recordId}"]`);
    if (!item) return;
    const record = getGoalRecord(goalId, recordId);
    if (!record) return;
    const content = record.content ? record.content.trim() : '';
    if (!content) return;

    const textEl = item.querySelector('.goal-record-text');
    if (!textEl) return;

    const isExpanded = item.classList.toggle('expanded');
    textEl.textContent = isExpanded ? content : truncateText(content, RECORD_PREVIEW_LENGTH);
    const toggleBtn = item.querySelector('.goal-record-toggle');
    if (toggleBtn) toggleBtn.textContent = isExpanded ? '收起' : '展开';
}

function createGoalRecordItem(goalId, record) {
    const typeLabel = TYPE_LABELS[record.type] || '灵感';
    const typeIcon = TYPE_ICONS[record.type] || 'fa-lightbulb';
    const recordTags = record.tags && record.tags.length > 0
        ? record.tags.map(t => `<span><i class="fas fa-tag"></i> ${escapeHtml(t)}</span>`).join('')
        : '';
    const recordContent = record.content ? record.content.trim() : '';
    const previewText = recordContent ? truncateText(recordContent, RECORD_PREVIEW_LENGTH) : '暂无内容';
    const canExpand = recordContent.length > RECORD_PREVIEW_LENGTH;

    return `
        <div class="goal-record-item" data-goal-id="${escapeHtml(String(goalId))}" data-record-id="${escapeHtml(String(record.id))}">
            <div class="goal-record-icon ${escapeHtml(record.type || 'inspiration')}">
                <i class="fas ${typeIcon}"></i>
            </div>
            <div class="goal-record-body">
                <div class="goal-record-title">${escapeHtml(record.title || typeLabel)}</div>
                <div class="goal-record-text">${escapeHtml(previewText)}</div>
                ${canExpand ? `<button class="goal-record-toggle" data-goal-id="${escapeHtml(String(goalId))}" data-record-id="${escapeHtml(String(record.id))}">展开</button>` : ''}
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

// ==================== CRUD 操作 ====================
export async function deleteGoal(id) {
    if (!confirm('确定要删除这个目标吗？所有记录也会被移除。')) return;
    try {
        await apiCall(`/goals/${id}`, 'DELETE');
        await loadGoals();
        showNotification('删除成功', 'success');
    } catch (error) {
        showNotification('删除失败', 'error');
    }
}

export async function deleteGoalRecord(goalId, recordId) {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
        await apiCall(`/goals/${goalId}/records/${recordId}`, 'DELETE');
        await loadGoals();
        showNotification('删除成功', 'success');
    } catch (error) {
        showNotification('删除失败', 'error');
    }
}

// ==================== Modal 操作 ====================
function resetGoalForm() {
    const form = document.getElementById('goalForm');
    if (form) form.reset();
    document.getElementById('goalProgress').value = 0;
    GoalsState.editingGoalId = null;
}

function resetRecordForm() {
    const form = document.getElementById('goalRecordForm');
    if (form) form.reset();
    document.getElementById('goalRecordDate').value = formatDateKey(new Date());
    GoalsState.editingRecordId = null;
    GoalsState.recordGoalId = null;
}

function openEditGoalModal(goal) {
    GoalsState.editingGoalId = goal.id;
    document.getElementById('goalModalTitle').textContent = '编辑目标';
    document.getElementById('goalTitle').value = goal.title || '';
    document.getElementById('goalVision').value = goal.vision || '';
    document.getElementById('goalCategory').value = goal.category || '';
    document.getElementById('goalStatus').value = goal.status || 'active';
    document.getElementById('goalStartDate').value = toDateInputValue(goal.startDate);
    document.getElementById('goalTargetDate').value = toDateInputValue(goal.targetDate);
    document.getElementById('goalProgress').value = goal.progress || 0;
    document.getElementById('goalTags').value = (goal.tags || []).join(', ');
    openModal('goal');
}

function openRecordModal(goal, record = null) {
    GoalsState.recordGoalId = goal.id;
    GoalsState.editingRecordId = record ? record.id : null;
    document.getElementById('goalRecordGoalName').textContent = goal.title || '';
    document.getElementById('goalRecordModalTitle').textContent = record ? '编辑记录' : '添加记录';
    document.getElementById('goalRecordTitle').value = record?.title || '';
    document.getElementById('goalRecordContent').value = record?.content || '';
    document.getElementById('goalRecordType').value = record?.type || 'inspiration';
    document.getElementById('goalRecordDate').value = toDateInputValue(record?.date || new Date());
    document.getElementById('goalRecordTags').value = (record?.tags || []).join(', ');
    openModal('goalRecord');
}

async function handleGoalSubmit(e) {
    e.preventDefault();

    const payload = {
        title: document.getElementById('goalTitle').value,
        vision: document.getElementById('goalVision').value,
        category: document.getElementById('goalCategory').value,
        status: document.getElementById('goalStatus').value,
        startDate: document.getElementById('goalStartDate').value || null,
        targetDate: document.getElementById('goalTargetDate').value || null,
        progress: document.getElementById('goalProgress').value,
        tags: parseTags(document.getElementById('goalTags').value)
    };

    try {
        if (GoalsState.editingGoalId) {
            await apiCall(`/goals/${GoalsState.editingGoalId}`, 'PUT', payload);
            showNotification('更新成功', 'success');
        } else {
            await apiCall('/goals', 'POST', payload);
            showNotification('创建成功', 'success');
        }
        closeModal('goal');
        resetGoalForm();
        loadGoals();
    } catch (error) {
        showNotification(error.message || '保存失败', 'error');
    }
}

async function handleRecordSubmit(e) {
    e.preventDefault();
    if (!GoalsState.recordGoalId) return;

    const payload = {
        title: document.getElementById('goalRecordTitle').value,
        content: document.getElementById('goalRecordContent').value,
        type: document.getElementById('goalRecordType').value,
        date: document.getElementById('goalRecordDate').value || null,
        tags: parseTags(document.getElementById('goalRecordTags').value)
    };

    try {
        if (GoalsState.editingRecordId) {
            await apiCall(`/goals/${GoalsState.recordGoalId}/records/${GoalsState.editingRecordId}`, 'PUT', payload);
            showNotification('更新成功', 'success');
        } else {
            await apiCall(`/goals/${GoalsState.recordGoalId}/records`, 'POST', payload);
            showNotification('记录成功', 'success');
        }
        closeModal('goalRecord');
        resetRecordForm();
        loadGoals();
    } catch (error) {
        showNotification(error.message || '保存失败', 'error');
    }
}

// ==================== 事件绑定 ====================
export function initGoalsEvents() {
    const addGoalBtn = document.getElementById('addGoalBtn');
    const goalForm = document.getElementById('goalForm');
    const recordForm = document.getElementById('goalRecordForm');

    addGoalBtn?.addEventListener('click', () => {
        document.getElementById('goalModalTitle').textContent = '新建目标';
        resetGoalForm();
        openModal('goal');
    });

    goalForm?.addEventListener('submit', handleGoalSubmit);
    recordForm?.addEventListener('submit', handleRecordSubmit);

    document.getElementById('goalSearchInput')?.addEventListener('input', debounce((e) => {
        GoalsState.searchQuery = e.target.value.trim();
        renderGoals();
    }, 300));

    document.getElementById('goalStatusFilter')?.addEventListener('change', (e) => {
        GoalsState.status = e.target.value;
        renderGoals();
    });

    document.getElementById('goalRecordTypeFilter')?.addEventListener('change', (e) => {
        GoalsState.recordType = e.target.value;
        renderGoals();
    });

    document.getElementById('goalSortSelect')?.addEventListener('change', (e) => {
        GoalsState.sort = e.target.value;
        renderGoals();
    });
}
