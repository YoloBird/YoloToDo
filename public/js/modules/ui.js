/**
 * UI 通用模块 - 通知、Modal 等
 */

// ==================== 通知系统 ====================
export function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    notification.innerHTML = `
        <i class="fas ${iconMap[type] || iconMap.info}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    // 动画显示
    requestAnimationFrame(() => notification.classList.add('show'));

    // 3秒后消失
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// ==================== Modal 管理 ====================
const modals = new Map();

export function registerModal(name, element) {
    modals.set(name, element);
}

export function openModal(name) {
    const modal = modals.get(name);
    if (modal) {
        modal.classList.add('show');
    }
}

export function closeModal(name) {
    const modal = modals.get(name);
    if (modal) {
        modal.classList.remove('show');
    }
}

export function closeAllModals() {
    modals.forEach(modal => modal.classList.remove('show'));
}

// ==================== Modal 初始化 ====================
export function initModals() {
    // 关闭按钮
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // 点击背景关闭
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', closeAllModals);
    });

    // 注册所有 modal
    const noteModal = document.getElementById('noteModal');
    const ideaModal = document.getElementById('ideaModal');
    const diaryModal = document.getElementById('diaryModal');
    const goalModal = document.getElementById('goalModal');
    const goalRecordModal = document.getElementById('goalRecordModal');
    const settingsModal = document.getElementById('settingsModal');

    if (noteModal) registerModal('note', noteModal);
    if (ideaModal) registerModal('idea', ideaModal);
    if (diaryModal) registerModal('diary', diaryModal);
    if (goalModal) registerModal('goal', goalModal);
    if (goalRecordModal) registerModal('goalRecord', goalRecordModal);
    if (settingsModal) registerModal('settings', settingsModal);
}

// ==================== 确认对话框 ====================
export function confirm(message) {
    return window.confirm(message);
}

// ==================== Loading 状态 ====================
export function setButtonLoading(btn, loading, originalHtml = null) {
    if (loading) {
        btn.dataset.originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';
    } else {
        btn.disabled = false;
        btn.innerHTML = originalHtml || btn.dataset.originalHtml || btn.innerHTML;
    }
}

// ==================== 颜色选择器 ====================
export function initColorPicker(pickerId, hiddenInputId, onSelect) {
    const picker = document.getElementById(pickerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!picker) return;

    picker.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', () => {
            picker.querySelectorAll('.color-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');
            const color = option.dataset.color || null;
            if (hiddenInput) hiddenInput.value = color || '';
            if (onSelect) onSelect(color);
        });
    });
}

export function resetColorPicker(pickerId, hiddenInputId) {
    const picker = document.getElementById(pickerId);
    if (!picker) return;

    picker.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    const firstOption = picker.querySelector('.color-option');
    if (firstOption) {
        firstOption.classList.add('selected');
    }

    const hiddenInput = document.getElementById(hiddenInputId);
    if (hiddenInput) hiddenInput.value = '';
}

export function setColorPickerValue(pickerId, hiddenInputId, color) {
    const picker = document.getElementById(pickerId);
    if (!picker) return;

    picker.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.remove('selected');
    });

    if (color) {
        const colorOption = picker.querySelector(`.color-option[data-color="${color}"]`);
        if (colorOption) {
            colorOption.classList.add('selected');
        }
    } else {
        const firstOption = picker.querySelector('.color-option');
        if (firstOption) firstOption.classList.add('selected');
    }

    const hiddenInput = document.getElementById(hiddenInputId);
    if (hiddenInput) hiddenInput.value = color || '';
}

// ==================== FAB 浮动按钮 ====================
export function initFAB() {
    const fabContainer = document.getElementById('quickAddFab');
    const fabMainBtn = document.getElementById('fabMainBtn');
    const fabAddNote = document.getElementById('fabAddNote');
    const fabAddIdea = document.getElementById('fabAddIdea');
    const fabAddDiary = document.getElementById('fabAddDiary');
    const fabAddGoal = document.getElementById('fabAddGoal');

    if (!fabContainer || !fabMainBtn) return;

    // 点击主按钮切换菜单
    fabMainBtn.addEventListener('click', () => {
        fabContainer.classList.toggle('open');
    });

    // 点击添加待办
    fabAddNote?.addEventListener('click', () => {
        fabContainer.classList.remove('open');
        // 触发添加待办按钮
        document.getElementById('addNoteBtn')?.click();
    });

    // 点击添加灵感
    fabAddIdea?.addEventListener('click', () => {
        fabContainer.classList.remove('open');
        // 触发添加灵感按钮
        document.getElementById('addIdeaBtn')?.click();
    });

    fabAddDiary?.addEventListener('click', () => {
        fabContainer.classList.remove('open');
        document.getElementById('addDiaryBtn')?.click();
    });

    fabAddGoal?.addEventListener('click', () => {
        fabContainer.classList.remove('open');
        document.getElementById('addGoalBtn')?.click();
    });

    // 点击外部关闭菜单
    document.addEventListener('click', (e) => {
        if (!fabContainer.contains(e.target)) {
            fabContainer.classList.remove('open');
        }
    });
}
