/**
 * Priority Matrix 模块 - 艾森豪威尔优先级矩阵
 * 四象限：紧急重要、重要不紧急、紧急不重要、不紧急不重要
 */

import { apiCall } from './api.js';
import { escapeHtml } from './utils.js';
import { showNotification } from './ui.js';

// 矩阵状态
export const MatrixState = {
    notes: [],
    quadrants: {
        q1: [], // 紧急且重要 (Do First)
        q2: [], // 重要不紧急 (Schedule)
        q3: [], // 紧急不重要 (Delegate)
        q4: []  // 不紧急不重要 (Eliminate)
    }
};

// 象限配置
const QUADRANT_CONFIG = {
    q1: {
        title: '紧急且重要',
        subtitle: '立即处理',
        icon: 'fa-fire',
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.08)'
    },
    q2: {
        title: '重要不紧急',
        subtitle: '计划安排',
        icon: 'fa-calendar-check',
        color: '#22c55e',
        bgColor: 'rgba(34, 197, 94, 0.08)'
    },
    q3: {
        title: '紧急不重要',
        subtitle: '委托他人',
        icon: 'fa-user-tag',
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.08)'
    },
    q4: {
        title: '不紧急不重要',
        subtitle: '考虑删除',
        icon: 'fa-trash-alt',
        color: '#6b7280',
        bgColor: 'rgba(107, 114, 128, 0.08)'
    }
};

// ==================== 数据加载 ====================
export async function loadMatrixData() {
    try {
        const notes = await apiCall('/notes');
        MatrixState.notes = notes || [];

        // 分类到四个象限
        classifyNotes();

        return MatrixState.quadrants;
    } catch (error) {
        console.error('Error loading matrix data:', error);
        showNotification('加载优先级矩阵失败', 'error');
        return MatrixState.quadrants;
    }
}

// ==================== 分类任务到象限 ====================
function classifyNotes() {
    // 重置象限
    MatrixState.quadrants = { q1: [], q2: [], q3: [], q4: [] };

    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    MatrixState.notes.forEach(note => {
        // 已完成的任务不显示
        if (note.completed) return;

        const isImportant = note.isImportant || note.priority === 'high';
        const isUrgent = isNoteUrgent(note, now, threeDaysLater);

        if (isImportant && isUrgent) {
            MatrixState.quadrants.q1.push(note);
        } else if (isImportant && !isUrgent) {
            MatrixState.quadrants.q2.push(note);
        } else if (!isImportant && isUrgent) {
            MatrixState.quadrants.q3.push(note);
        } else {
            MatrixState.quadrants.q4.push(note);
        }
    });

    // 按截止日期排序
    Object.keys(MatrixState.quadrants).forEach(key => {
        MatrixState.quadrants[key].sort((a, b) => {
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    });
}

// 判断任务是否紧急
function isNoteUrgent(note, now, threeDaysLater) {
    // 有截止日期且在3天内
    if (note.dueDate) {
        const dueDate = new Date(note.dueDate);
        return dueDate <= threeDaysLater;
    }

    // 有提醒且在3天内
    if (note.reminderDate) {
        const reminderDate = new Date(note.reminderDate);
        return reminderDate <= threeDaysLater;
    }

    // 高优先级视为紧急
    if (note.priority === 'high') {
        return true;
    }

    return false;
}

// ==================== 渲染矩阵 ====================
export function renderMatrix(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { onNoteClick, compact = false } = options;

    const totalTasks = Object.values(MatrixState.quadrants).reduce((sum, q) => sum + q.length, 0);

    if (totalTasks === 0) {
        container.innerHTML = `
            <div class="matrix-empty ${compact ? 'compact' : ''}">
                <i class="fas fa-th-large"></i>
                <p>暂无待办任务</p>
                ${!compact ? '<span>完成所有任务后这里会清空</span>' : ''}
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="matrix-grid ${compact ? 'compact' : ''}">
            ${Object.entries(QUADRANT_CONFIG).map(([key, config]) => {
                const items = MatrixState.quadrants[key];
                const displayItems = compact ? items.slice(0, 3) : items;
                const hasMore = compact && items.length > 3;
                return `
                    <div class="matrix-quadrant" data-quadrant="${key}" style="--quadrant-color: ${config.color}; --quadrant-bg: ${config.bgColor}">
                        <div class="quadrant-header">
                            <div class="quadrant-title">
                                <i class="fas ${config.icon}" style="color: ${config.color}"></i>
                                <span>${compact ? '' : config.title}</span>
                                <span class="quadrant-count">${items.length}</span>
                            </div>
                            ${!compact ? `<span class="quadrant-subtitle">${config.subtitle}</span>` : ''}
                        </div>
                        <div class="quadrant-items">
                            ${items.length === 0 ? `
                                <div class="quadrant-empty">
                                    <i class="fas fa-check-circle"></i>
                                </div>
                            ` : displayItems.map(note => renderMatrixItem(note, compact)).join('')}
                            ${hasMore ? `<div class="matrix-more">+${items.length - 3} 更多</div>` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // 绑定点击事件
    if (onNoteClick) {
        container.querySelectorAll('.matrix-item').forEach(item => {
            item.addEventListener('click', () => {
                const noteId = item.dataset.noteId;
                const note = MatrixState.notes.find(n => n.id === noteId);
                if (note) onNoteClick(note);
            });
        });
    }
}

function renderMatrixItem(note, compact = false) {
    const dueLabel = note.dueDate ? formatDueDate(note.dueDate) : '';

    if (compact) {
        return `
            <div class="matrix-item compact" data-note-id="${note.id}">
                <span class="matrix-item-title">${escapeHtml(note.title)}</span>
                ${note.isImportant ? '<i class="fas fa-star matrix-item-star"></i>' : ''}
            </div>
        `;
    }

    const categoryLabel = note.category ? `<span class="matrix-item-category">${escapeHtml(note.category)}</span>` : '';

    return `
        <div class="matrix-item" data-note-id="${note.id}">
            <div class="matrix-item-header">
                <span class="matrix-item-title">${escapeHtml(note.title)}</span>
                ${note.isImportant ? '<i class="fas fa-star matrix-item-star"></i>' : ''}
            </div>
            <div class="matrix-item-meta">
                ${dueLabel ? `<span class="matrix-item-due">${dueLabel}</span>` : ''}
                ${categoryLabel}
            </div>
        </div>
    `;
}

function formatDueDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return `<span class="overdue">已过期 ${Math.abs(diffDays)} 天</span>`;
    } else if (diffDays === 0) {
        return '<span class="due-today">今天截止</span>';
    } else if (diffDays === 1) {
        return '<span class="due-tomorrow">明天截止</span>';
    } else if (diffDays <= 7) {
        return `<span class="due-soon">${diffDays} 天后</span>`;
    } else {
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }
}

// ==================== 获取统计 ====================
export function getMatrixStats() {
    return {
        q1: MatrixState.quadrants.q1.length,
        q2: MatrixState.quadrants.q2.length,
        q3: MatrixState.quadrants.q3.length,
        q4: MatrixState.quadrants.q4.length,
        total: Object.values(MatrixState.quadrants).reduce((sum, q) => sum + q.length, 0)
    };
}

// ==================== 初始化 ====================
export async function initMatrix() {
    await loadMatrixData();
}
