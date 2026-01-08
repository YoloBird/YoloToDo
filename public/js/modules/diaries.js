/**
 * Diaries 模块 - 日记管理
 */

import { apiCall } from './api.js';
import { DiariesState } from './state.js';
import { escapeHtml, formatDateKey, formatRelativeDate, renderMarkdown, debounce } from './utils.js';
import { showNotification, openModal, closeModal, confirm } from './ui.js';

const DEFAULT_MOODS = ['开心', '平静', '低落', '焦虑', '兴奋'];
const DIARY_PREVIEW_LENGTH = 140;

const MOOD_ICON_MAP = {
    开心: 'fa-face-smile',
    平静: 'fa-face-meh',
    低落: 'fa-face-frown',
    焦虑: 'fa-face-grimace',
    兴奋: 'fa-face-grin-stars'
};

const formatDateOnly = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

const toDateInputValue = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return formatDateKey(date);
};

const parseTags = (value) => {
    if (!value) return [];
    return value.split(',').map(tag => tag.trim()).filter(Boolean);
};

const getTodayKey = () => formatDateKey(new Date());

const applyDiaryDateConstraints = (value, notifyOnClamp = false) => {
    const dateInput = document.getElementById('diaryDate');
    if (!dateInput) return;
    const todayKey = getTodayKey();
    dateInput.max = todayKey;
    const safeValue = value && value <= todayKey ? value : todayKey;
    if (value && value > todayKey && notifyOnClamp) {
        showNotification('日记日期不能晚于今天，已调整为今天', 'info');
    }
    dateInput.value = safeValue;
};

const stripMarkdown = (text) => {
    if (!text) return '';
    return text
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[`*_>#~\-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const truncateText = (text, length = DIARY_PREVIEW_LENGTH) => {
    if (!text) return '';
    return text.length > length ? `${text.slice(0, length)}...` : text;
};

const getDiaryDateKey = (diary) => {
    const dateValue = new Date(diary.entryDate || diary.createdAt);
    return Number.isNaN(dateValue.getTime()) ? '' : formatDateKey(dateValue);
};

// ==================== 数据加载 ====================
export async function loadDiaries() {
    try {
        DiariesState.allDiaries = await apiCall('/diaries');
        updateDiaryMoodFilter();
        renderDiaries();
        updateDiaryStats();
    } catch (error) {
        console.error('Error loading diaries:', error);
        showNotification('加载日记失败', 'error');
    }
}

// ==================== 统计更新 ====================
export function updateDiaryStats() {
    const total = DiariesState.allDiaries.length;
    const now = new Date();
    const monthCount = DiariesState.allDiaries.filter(d => {
        const date = new Date(d.entryDate || d.createdAt);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    const streak = calculateStreak();

    const totalEl = document.getElementById('diaryTotalCount');
    const monthEl = document.getElementById('diaryMonthCount');
    const streakEl = document.getElementById('diaryStreakCount');

    if (totalEl) totalEl.textContent = total;
    if (monthEl) monthEl.textContent = monthCount;
    if (streakEl) streakEl.textContent = streak;
}

function calculateStreak() {
    if (DiariesState.allDiaries.length === 0) return 0;
    const dateKeys = new Set(
        DiariesState.allDiaries.map(d => formatDateKey(new Date(d.entryDate || d.createdAt)))
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

// ==================== 心情过滤器更新 ====================
export function updateDiaryMoodFilter() {
    const select = document.getElementById('diaryMoodFilter');
    if (!select) return;

    const moods = new Set(DEFAULT_MOODS);
    DiariesState.allDiaries.forEach(d => {
        if (d.mood) moods.add(d.mood);
    });

    const currentValue = select.value;
    select.innerHTML = '<option value="">全部心情</option>';
    Array.from(moods).forEach(mood => {
        select.innerHTML += `<option value="${escapeHtml(mood)}">${escapeHtml(mood)}</option>`;
    });

    if (currentValue) select.value = currentValue;
}

// ==================== 筛选和排序 ====================
export function getFilteredDiaries() {
    let filtered = [...DiariesState.allDiaries];

    if (DiariesState.mood) {
        filtered = filtered.filter(d => d.mood === DiariesState.mood);
    }

    if (DiariesState.range && DiariesState.range !== 'all') {
        const now = new Date();
        filtered = filtered.filter(d => {
            const dateValue = new Date(d.entryDate || d.createdAt);
            if (Number.isNaN(dateValue.getTime())) return false;
            if (DiariesState.range === 'year') {
                return dateValue.getFullYear() === now.getFullYear();
            }
            const windowDays = DiariesState.range === '7d' ? 7 : 30;
            const diffDays = (now - dateValue) / (1000 * 60 * 60 * 24);
            return diffDays >= 0 && diffDays <= windowDays;
        });
    }

    if (DiariesState.dateFilter) {
        filtered = filtered.filter(diary => getDiaryDateKey(diary) === DiariesState.dateFilter);
    }

    if (DiariesState.searchQuery) {
        const q = DiariesState.searchQuery.toLowerCase();
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
        if (DiariesState.sort === 'oldest') return dateA - dateB;
        return dateB - dateA;
    });

    return filtered;
}

export function getPaginatedDiaries() {
    const filtered = getFilteredDiaries();
    const totalPages = Math.ceil(filtered.length / DiariesState.perPage) || 1;

    if (DiariesState.currentPage > totalPages) DiariesState.currentPage = totalPages;
    if (DiariesState.currentPage < 1) DiariesState.currentPage = 1;

    const start = (DiariesState.currentPage - 1) * DiariesState.perPage;
    return {
        diaries: filtered.slice(start, start + DiariesState.perPage),
        totalDiaries: filtered.length,
        totalPages
    };
}

// ==================== 渲染 ====================
function updateDiaryListCount(totalDiaries) {
    const listCount = document.getElementById('diaryListCount');
    if (!listCount) return;
    const dateLabel = DiariesState.dateFilter ? ` · ${DiariesState.dateFilter}` : '';
    listCount.textContent = `共 ${totalDiaries} 篇${dateLabel}`;
}

function resolveSelectedDiary(diaries) {
    if (!diaries.length) {
        DiariesState.selectedDiaryId = null;
        return null;
    }
    const selected = diaries.find(diary => String(diary.id) === String(DiariesState.selectedDiaryId));
    if (selected) return selected;
    DiariesState.selectedDiaryId = diaries[0].id;
    return diaries[0];
}

export function renderDiaries() {
    const container = document.getElementById('diaryContainer');
    const emptyState = document.getElementById('diaryEmptyState');
    const paginationContainer = document.getElementById('diaryPaginationContainer');

    if (!container) return;

    const { diaries, totalDiaries, totalPages } = getPaginatedDiaries();
    updateDiaryListCount(totalDiaries);

    if (totalDiaries === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        if (paginationContainer) paginationContainer.style.display = 'none';
        DiariesState.selectedDiaryId = null;
        renderDiaryDetail(null);
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (paginationContainer) {
        paginationContainer.style.display = totalDiaries > DiariesState.perPage ? 'flex' : 'none';
    }

    if (totalDiaries > DiariesState.perPage) {
        const pageInfo = document.getElementById('diaryPageInfo');
        const prevBtn = document.getElementById('diaryPrevPage');
        const nextBtn = document.getElementById('diaryNextPage');
        if (pageInfo) pageInfo.textContent = `第 ${DiariesState.currentPage} / ${totalPages} 页`;
        if (prevBtn) prevBtn.disabled = DiariesState.currentPage === 1;
        if (nextBtn) nextBtn.disabled = DiariesState.currentPage === totalPages;
    }

    const selectedDiary = resolveSelectedDiary(diaries);

    container.innerHTML = diaries
        .map((diary, index) => createDiaryListCard(diary, index, selectedDiary && diary.id === selectedDiary.id))
        .join('');

    container.querySelectorAll('.diary-card').forEach(card => {
        card.addEventListener('click', () => {
            const diaryId = card.dataset.diaryId;
            if (!diaryId) return;
            DiariesState.selectedDiaryId = diaryId;
            renderDiaries();
        });
    });

    renderDiaryDetail(selectedDiary);
}

function renderDiaryDetail(diary) {
    const detailTitle = document.getElementById('diaryDetailTitle');
    const detailDate = document.getElementById('diaryDetailDate');
    const detailMeta = document.getElementById('diaryDetailMeta');
    const detailContent = document.getElementById('diaryDetailContent');
    const detailEmpty = document.getElementById('diaryDetailEmpty');
    const editBtn = document.getElementById('diaryDetailEditBtn');
    const deleteBtn = document.getElementById('diaryDetailDeleteBtn');
    const prevBtn = document.getElementById('diaryPrevBtn');
    const nextBtn = document.getElementById('diaryNextBtn');

    if (!detailTitle || !detailDate || !detailMeta || !detailContent || !detailEmpty) return;

    if (!diary) {
        detailTitle.textContent = '请选择日记';
        detailDate.textContent = '';
        detailMeta.innerHTML = '';
        detailContent.innerHTML = '';
        detailContent.style.display = 'none';
        detailEmpty.style.display = 'flex';
        if (editBtn) editBtn.disabled = true;
        if (deleteBtn) deleteBtn.disabled = true;
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
    }

    const entryDate = diary.entryDate || diary.createdAt;
    const mood = diary.mood || '平静';
    const moodIcon = MOOD_ICON_MAP[mood] || 'fa-face-smile';
    const weatherBadge = diary.weather
        ? `<span class="badge badge-weather"><i class="fas fa-cloud-sun"></i> ${escapeHtml(diary.weather)}</span>`
        : '';
    const tags = diary.tags && diary.tags.length > 0
        ? diary.tags.map(t => `<span class="badge badge-category"><i class="fas fa-tag"></i> ${escapeHtml(t)}</span>`).join('')
        : '';

    detailTitle.textContent = diary.title || '无标题日记';
    detailDate.textContent = `${formatRelativeDate(entryDate)} · ${formatDateOnly(entryDate)}`;
    detailMeta.innerHTML = `
        <span class="badge badge-mood"><i class="fas ${moodIcon}"></i> ${escapeHtml(mood)}</span>
        ${weatherBadge}
        ${tags}
    `;
    detailContent.innerHTML = diary.content
        ? renderMarkdown(diary.content)
        : '<p class="diary-detail-placeholder">暂无内容</p>';
    detailContent.style.display = 'block';
    detailEmpty.style.display = 'none';

    if (editBtn) {
        editBtn.disabled = false;
        editBtn.onclick = () => openEditDiaryModal(diary);
    }
    if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.onclick = () => deleteDiary(diary.id);
    }

    const filtered = getFilteredDiaries();
    const currentIndex = filtered.findIndex(item => String(item.id) === String(diary.id));
    if (prevBtn) {
        prevBtn.disabled = currentIndex <= 0;
        prevBtn.onclick = () => navigateDiary(-1);
    }
    if (nextBtn) {
        nextBtn.disabled = currentIndex < 0 || currentIndex >= filtered.length - 1;
        nextBtn.onclick = () => navigateDiary(1);
    }
}

function createDiaryListCard(diary, index, isSelected) {
    const mood = diary.mood || '平静';
    const moodIcon = MOOD_ICON_MAP[mood] || 'fa-face-smile';
    const tags = diary.tags || [];
    const visibleTags = tags.slice(0, 2);
    const extraTags = tags.length - visibleTags.length;
    const tagsHtml = visibleTags
        .map(tag => `<span class="badge badge-category"><i class="fas fa-tag"></i> ${escapeHtml(tag)}</span>`)
        .join('');
    const extraTagHtml = extraTags > 0
        ? `<span class="badge badge-category">+${extraTags}</span>`
        : '';
    const weatherBadge = diary.weather
        ? `<span class="badge badge-weather"><i class="fas fa-cloud-sun"></i> ${escapeHtml(diary.weather)}</span>`
        : '';
    const contentText = stripMarkdown(diary.content || '');
    const previewText = truncateText(contentText, DIARY_PREVIEW_LENGTH) || '暂无内容';
    const entryDate = diary.entryDate || diary.createdAt;
    const selectedClass = isSelected ? ' is-selected' : '';

    return `
        <div class="diary-card diary-card-compact${selectedClass}" data-diary-id="${escapeHtml(String(diary.id))}" style="--stagger: ${index}">
            <div class="diary-card-header">
                <div class="diary-card-title">
                    <i class="fas fa-feather"></i>
                    ${escapeHtml(diary.title || '无标题日记')}
                </div>
                <div class="diary-card-date">
                    <span class="diary-date-pill">${escapeHtml(formatRelativeDate(entryDate))}</span>
                    <span class="diary-date-full">${formatDateOnly(entryDate)}</span>
                </div>
            </div>
            <div class="diary-card-meta">
                <span class="badge badge-mood"><i class="fas ${moodIcon}"></i> ${escapeHtml(mood)}</span>
                ${weatherBadge}
                ${tagsHtml}
                ${extraTagHtml}
            </div>
            <div class="diary-card-preview">${escapeHtml(previewText)}</div>
        </div>
    `;
}

function navigateDiary(offset) {
    const filtered = getFilteredDiaries();
    if (!filtered.length || !DiariesState.selectedDiaryId) return;
    const currentIndex = filtered.findIndex(item => String(item.id) === String(DiariesState.selectedDiaryId));
    const nextIndex = currentIndex + offset;
    if (nextIndex < 0 || nextIndex >= filtered.length) return;
    const target = filtered[nextIndex];
    DiariesState.selectedDiaryId = target.id;
    DiariesState.currentPage = Math.floor(nextIndex / DiariesState.perPage) + 1;
    renderDiaries();
}

// ==================== CRUD 操作 ====================
export async function deleteDiary(id) {
    if (!confirm('确定要删除这篇日记吗？')) return;
    try {
        await apiCall(`/diaries/${id}`, 'DELETE');
        await loadDiaries();
        showNotification('删除成功', 'success');
    } catch (error) {
        showNotification('删除失败', 'error');
    }
}

// ==================== Modal 操作 ====================
function resetDiaryForm(dateOverride = null) {
    const form = document.getElementById('diaryForm');
    if (form) form.reset();
    applyDiaryDateConstraints(dateOverride);
    DiariesState.editingDiaryId = null;
}

function openEditDiaryModal(diary) {
    DiariesState.editingDiaryId = diary.id;
    document.getElementById('diaryModalTitle').textContent = '编辑日记';
    document.getElementById('diaryTitle').value = diary.title || '';
    document.getElementById('diaryContent').value = diary.content || '';
    document.getElementById('diaryMood').value = diary.mood || '平静';
    document.getElementById('diaryWeather').value = diary.weather || '';
    document.getElementById('diaryTags').value = (diary.tags || []).join(', ');
    applyDiaryDateConstraints(toDateInputValue(diary.entryDate || diary.createdAt), true);
    openModal('diary');
}

async function handleDiarySubmit(e) {
    e.preventDefault();

    const title = document.getElementById('diaryTitle').value;
    const content = document.getElementById('diaryContent').value;
    const mood = document.getElementById('diaryMood').value;
    const weather = document.getElementById('diaryWeather').value;
    const tags = document.getElementById('diaryTags').value;
    const date = document.getElementById('diaryDate').value;
    const todayKey = getTodayKey();

    if (date && date > todayKey) {
        showNotification('日记日期不能晚于今天', 'error');
        return;
    }

    const payload = {
        title,
        content,
        mood,
        weather,
        tags: parseTags(tags),
        entryDate: date ? new Date(date).toISOString() : new Date().toISOString()
    };

    try {
        if (DiariesState.editingDiaryId) {
            await apiCall(`/diaries/${DiariesState.editingDiaryId}`, 'PUT', payload);
            showNotification('更新成功', 'success');
        } else {
            await apiCall('/diaries', 'POST', payload);
            showNotification('记录成功', 'success');
        }
        closeModal('diary');
        resetDiaryForm();
        loadDiaries();
    } catch (error) {
        showNotification(error.message || '保存失败', 'error');
    }
}

// ==================== 事件绑定 ====================
export function initDiaryEvents() {
    const addBtn = document.getElementById('addDiaryBtn');
    const form = document.getElementById('diaryForm');

    addBtn?.addEventListener('click', () => {
        document.getElementById('diaryModalTitle').textContent = '写日记';
        resetDiaryForm();
        openModal('diary');
    });

    form?.addEventListener('submit', handleDiarySubmit);

    document.getElementById('diaryTodayBtn')?.addEventListener('click', () => {
        const todayKey = formatDateKey(new Date());
        const dateInput = document.getElementById('diaryDateFilter');
        if (dateInput) dateInput.value = todayKey;
        DiariesState.dateFilter = todayKey;
        DiariesState.currentPage = 1;
        renderDiaries();
    });

    document.getElementById('diaryDateFilter')?.addEventListener('change', (e) => {
        DiariesState.dateFilter = e.target.value;
        DiariesState.currentPage = 1;
        renderDiaries();
    });

    document.getElementById('diaryDateClearBtn')?.addEventListener('click', () => {
        const dateInput = document.getElementById('diaryDateFilter');
        if (dateInput) dateInput.value = '';
        DiariesState.dateFilter = '';
        DiariesState.currentPage = 1;
        renderDiaries();
    });

    document.getElementById('diaryDetailWriteBtn')?.addEventListener('click', () => {
        const presetDate = DiariesState.dateFilter || formatDateKey(new Date());
        document.getElementById('diaryModalTitle').textContent = '写日记';
        resetDiaryForm(presetDate);
        openModal('diary');
    });

    document.getElementById('diarySearchInput')?.addEventListener('input', debounce((e) => {
        DiariesState.searchQuery = e.target.value.trim();
        DiariesState.currentPage = 1;
        renderDiaries();
    }, 300));

    document.getElementById('diaryMoodFilter')?.addEventListener('change', (e) => {
        DiariesState.mood = e.target.value;
        DiariesState.currentPage = 1;
        renderDiaries();
    });

    document.getElementById('diaryRangeFilter')?.addEventListener('change', (e) => {
        DiariesState.range = e.target.value;
        DiariesState.currentPage = 1;
        renderDiaries();
    });

    document.getElementById('diarySortSelect')?.addEventListener('change', (e) => {
        DiariesState.sort = e.target.value;
        renderDiaries();
    });

    document.getElementById('diaryPerPageSelect')?.addEventListener('change', (e) => {
        DiariesState.perPage = parseInt(e.target.value, 10) || 9;
        DiariesState.currentPage = 1;
        renderDiaries();
    });

    document.getElementById('diaryPrevPage')?.addEventListener('click', () => {
        DiariesState.currentPage -= 1;
        renderDiaries();
    });

    document.getElementById('diaryNextPage')?.addEventListener('click', () => {
        DiariesState.currentPage += 1;
        renderDiaries();
    });
}
