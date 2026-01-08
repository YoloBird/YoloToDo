/**
 * Timeline 模块 - 时光看板
 */

import { apiCall } from './api.js';
import { TimelineState } from './state.js';
import { escapeHtml, formatDateKey } from './utils.js';
import { showNotification } from './ui.js';
import { loadMatrixData, renderMatrix } from './matrix.js';

// ==================== 数据加载 ====================
export async function loadTimeline() {
    try {
        // 同时加载活跃便签、归档便签
        const [notes, archivedNotes, ideas] = await Promise.all([
            apiCall('/notes'),
            apiCall('/notes/archived'),
            apiCall('/ideas')
        ]);

        // 合并活跃和归档便签，归档便签添加标记
        const allNotes = [
            ...(notes || []),
            ...(archivedNotes || []).map(n => ({ ...n, isArchived: true }))
        ];

        TimelineState.allData.notes = allNotes;
        TimelineState.allData.ideas = ideas || [];

        renderCalendar();
        updateTimelineStats();
        selectDate(TimelineState.selectedDate);

        // 加载并渲染优先级矩阵
        await loadMatrixData();
        renderMatrix('matrixContainer');
    } catch (error) {
        console.error('Timeline load error:', error);
        showNotification('加载时光看板失败', 'error');
    }
}

// ==================== 日历渲染 ====================
export function renderCalendar() {
    const year = TimelineState.currentYear;
    const month = TimelineState.currentMonth;

    // 更新标题
    const titleEl = document.getElementById('calendarTitle');
    if (titleEl) titleEl.textContent = `${year}年${month + 1}月`;

    // 计算日期信息
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const container = document.getElementById('calendarDays');
    if (!container) return;

    container.innerHTML = '';

    const today = new Date();
    const todayStr = formatDateKey(today);
    const selectedStr = formatDateKey(TimelineState.selectedDate);

    // 上月日期
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const date = new Date(year, month - 1, day);
        container.appendChild(createCalendarDay(date, day, true));
    }

    // 当月日期
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDateKey(date);
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === selectedStr;
        container.appendChild(createCalendarDay(date, day, false, isToday, isSelected));
    }

    // 下月日期（填满6行）
    const totalCells = container.children.length;
    const remainingCells = 42 - totalCells;
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

    // 添加活动点
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

// ==================== 日期选择 ====================
export function selectDate(date) {
    TimelineState.selectedDate = date;
    const dateStr = formatDateKey(date);

    // 更新标题
    const today = new Date();
    const isToday = formatDateKey(today) === dateStr;
    const isYesterday = formatDateKey(new Date(today.getTime() - 86400000)) === dateStr;

    let titleText = '';
    if (isToday) titleText = '今天';
    else if (isYesterday) titleText = '昨天';
    else titleText = `${date.getMonth() + 1}月${date.getDate()}日`;

    const titleEl = document.getElementById('selectedDateTitle');
    const fullEl = document.getElementById('selectedDateFull');

    if (titleEl) titleEl.textContent = titleText;
    if (fullEl) {
        fullEl.textContent = date.toLocaleDateString('zh-CN', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
        });
    }

    // 获取当天数据
    const dayNotes = TimelineState.allData.notes.filter(n => formatDateKey(new Date(n.createdAt)) === dateStr);
    const dayIdeas = TimelineState.allData.ideas.filter(i => formatDateKey(new Date(i.createdAt)) === dateStr);
    const completed = dayNotes.filter(n => n.completed);

    // 更新统计
    const notesCountEl = document.getElementById('dayNotesCount');
    const completedCountEl = document.getElementById('dayCompletedCount');
    const ideasCountEl = document.getElementById('dayIdeasCount');

    if (notesCountEl) notesCountEl.textContent = dayNotes.length;
    if (completedCountEl) completedCountEl.textContent = completed.length;
    if (ideasCountEl) ideasCountEl.textContent = dayIdeas.length;

    // 渲染时间线
    renderDayTimeline(dayNotes, dayIdeas);
}

function renderDayTimeline(dayNotes, dayIdeas) {
    const timeline = document.getElementById('dayTimeline');
    if (!timeline) return;

    if (dayNotes.length === 0 && dayIdeas.length === 0) {
        timeline.innerHTML = `
            <div class="empty-day">
                <i class="fas fa-calendar-day"></i>
                <p>这一天没有记录</p>
            </div>
        `;
        return;
    }

    // 合并并按时间排序
    const items = [
        ...dayNotes.map(n => ({ type: 'note', data: n, time: new Date(n.createdAt) })),
        ...dayIdeas.map(i => ({ type: 'idea', data: i, time: new Date(i.createdAt) }))
    ].sort((a, b) => b.time - a.time);

    timeline.innerHTML = items.map(item => {
        const isCompleted = item.type === 'note' && item.data.completed;
        const isArchived = item.type === 'note' && item.data.isArchived;
        const iconClass = isArchived ? 'archived' : (isCompleted ? 'completed' : item.type);
        const icon = isArchived ? 'fa-archive' : (isCompleted ? 'fa-check' : (item.type === 'note' ? 'fa-clipboard-check' : 'fa-lightbulb'));
        const typeLabel = isArchived ? '已归档' : (item.type === 'note' ? (isCompleted ? '已完成' : '待办') : '想法');
        const time = item.time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

        return `
            <div class="timeline-item ${isArchived ? 'archived' : ''}">
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

// ==================== 统计更新 ====================
export function updateTimelineStats() {
    // 计算连续天数
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

    const streakEl = document.getElementById('streakDays');
    if (streakEl) streakEl.textContent = streak;

    // 本月统计
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthNotes = TimelineState.allData.notes.filter(n => new Date(n.createdAt) >= monthStart);
    const monthIdeas = TimelineState.allData.ideas.filter(i => new Date(i.createdAt) >= monthStart);
    const monthCompleted = monthNotes.filter(n => n.completed);

    const monthCompletedEl = document.getElementById('monthCompleted');
    const monthIdeasEl = document.getElementById('monthIdeas');

    if (monthCompletedEl) monthCompletedEl.textContent = monthCompleted.length;
    if (monthIdeasEl) monthIdeasEl.textContent = monthIdeas.length;

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

    // 本周统计
    updateWeekStats();
}

function updateWeekStats() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

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

    // 更新 UI
    const weekCreatedEl = document.getElementById('weekCreated');
    const weekCompletedEl = document.getElementById('weekCompleted');
    const weekIdeasEl = document.getElementById('weekIdeas');
    const weekRateEl = document.getElementById('weekRate');

    if (weekCreatedEl) weekCreatedEl.textContent = weekNotes.length;
    if (weekCompletedEl) weekCompletedEl.textContent = weekCompleted.length;
    if (weekIdeasEl) weekIdeasEl.textContent = weekIdeas.length;
    if (weekRateEl) weekRateEl.textContent = completionRate + '%';

    // 渲染周图表
    renderWeekChart(weekStart);
}

function renderWeekChart(weekStart) {
    const container = document.getElementById('weekChart');
    if (!container) return;

    const days = ['一', '二', '三', '四', '五', '六', '日'];
    let maxActivity = 0;
    const dailyData = [];

    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = formatDateKey(date);

        const dayNotes = TimelineState.allData.notes.filter(n => formatDateKey(new Date(n.createdAt)) === dateStr);
        const dayIdeas = TimelineState.allData.ideas.filter(i => formatDateKey(new Date(i.createdAt)) === dateStr);

        const activity = dayNotes.length + dayIdeas.length;
        dailyData.push({ day: days[i], activity, date });
        if (activity > maxActivity) maxActivity = activity;
    }

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

// ==================== 事件绑定 ====================
export function initTimelineEvents() {
    // 上月
    document.getElementById('prevMonth')?.addEventListener('click', () => {
        TimelineState.currentMonth--;
        if (TimelineState.currentMonth < 0) {
            TimelineState.currentMonth = 11;
            TimelineState.currentYear--;
        }
        renderCalendar();
    });

    // 下月
    document.getElementById('nextMonth')?.addEventListener('click', () => {
        TimelineState.currentMonth++;
        if (TimelineState.currentMonth > 11) {
            TimelineState.currentMonth = 0;
            TimelineState.currentYear++;
        }
        renderCalendar();
    });

    // 今天
    document.getElementById('todayBtn')?.addEventListener('click', () => {
        const today = new Date();
        TimelineState.currentMonth = today.getMonth();
        TimelineState.currentYear = today.getFullYear();
        TimelineState.selectedDate = today;
        renderCalendar();
        selectDate(today);
    });
}
