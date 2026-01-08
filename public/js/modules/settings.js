/**
 * Settings 模块 - 设置页面
 */

import { apiCall, getUser, setUser, setToken, logout } from './api.js';
import { showNotification, openModal, setButtonLoading } from './ui.js';

// ==================== 用户信息显示 ====================
export function updateUserEmailDisplay() {
    const user = getUser();
    const emailEl = document.getElementById('userEmail');
    if (emailEl) {
        emailEl.textContent = user.username || user.id || user.email || '';
    }
}

export function syncAccountUsernameInput() {
    const user = getUser();
    const input = document.getElementById('accountUsername');
    if (input) {
        input.value = user.username || user.id || '';
    }
}

export function syncNotificationEmailInput() {
    const user = getUser();
    const input = document.getElementById('notificationEmail');
    if (input) {
        input.value = user.email || '';
    }
}

export function syncTelegramChatIdInput() {
    const user = getUser();
    const input = document.getElementById('telegramChatId');
    if (input) {
        input.value = user.telegramChatId || '';
    }
}

// ==================== 事件绑定 ====================
export function initSettingsEvents() {
    // 打开设置
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
        openModal('settings');
        syncAccountUsernameInput();
        syncNotificationEmailInput();
        syncTelegramChatIdInput();
    });

    // 登出
    document.getElementById('logoutBtn')?.addEventListener('click', logout);

    // Tab 切换
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tabName + 'Tab')?.classList.add('active');
        });
    });

    // 账户表单
    document.getElementById('accountForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('accountUsername');
        const username = input?.value.trim();

        if (!username) {
            showNotification('用户名不能为空', 'error');
            return;
        }

        try {
            const result = await apiCall('/auth/account', 'PUT', { username });

            if (result.token) {
                setToken(result.token);
            }

            if (result.user) {
                const user = getUser();
                user.username = result.user.username || user.username;
                if (result.user.email !== undefined) user.email = result.user.email;
                if (result.user.telegramChatId !== undefined) user.telegramChatId = result.user.telegramChatId;
                setUser(user);
            }

            updateUserEmailDisplay();
            syncAccountUsernameInput();
            showNotification(result.message || '账户设置已更新', 'success');
        } catch (error) {
            showNotification(error?.data?.error || error?.message || '保存失败', 'error');
        }
    });

    // 通知设置表单
    document.getElementById('notificationForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const telegramChatId = document.getElementById('telegramChatId')?.value.trim();
        const notificationEmail = document.getElementById('notificationEmail')?.value.trim();

        try {
            await apiCall('/auth/settings', 'PUT', {
                telegramChatId: telegramChatId || null,
                notificationEmail: notificationEmail || null
            });

            const user = getUser();
            user.telegramChatId = telegramChatId || null;
            user.email = notificationEmail || null;
            setUser(user);

            showNotification('通知设置已保存', 'success');
        } catch (error) {
            showNotification(error?.message || '保存失败', 'error');
        }
    });

    // 测试邮件
    document.getElementById('testEmailBtn')?.addEventListener('click', async () => {
        const user = getUser();
        const notificationEmail = document.getElementById('notificationEmail')?.value.trim();

        if (!notificationEmail && !user.email) {
            showNotification('请先填写通知邮箱', 'error');
            return;
        }

        const btn = document.getElementById('testEmailBtn');
        setButtonLoading(btn, true);

        try {
            const result = await apiCall('/auth/settings/test-email', 'POST', { notificationEmail });
            showNotification(result.message || '测试邮件已发送', 'success');
        } catch (error) {
            showNotification(error?.data?.error || error?.message || '发送失败', 'error');
        } finally {
            setButtonLoading(btn, false, '<i class="fas fa-paper-plane"></i> 发送测试');
        }
    });

    // 测试 Telegram
    document.getElementById('testTelegramBtn')?.addEventListener('click', async () => {
        const telegramChatId = document.getElementById('telegramChatId')?.value.trim();

        if (!telegramChatId) {
            showNotification('请先填写 Telegram Chat ID', 'error');
            return;
        }

        const btn = document.getElementById('testTelegramBtn');
        setButtonLoading(btn, true);

        try {
            const result = await apiCall('/auth/settings/test-telegram', 'POST', { telegramChatId });
            showNotification(result.message || '测试消息已发送', 'success');
        } catch (error) {
            showNotification(error?.data?.error || error?.message || '发送失败', 'error');
        } finally {
            setButtonLoading(btn, false, '<i class="fab fa-telegram"></i> 发送测试');
        }
    });

    // 修改密码
    document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const oldPassword = document.getElementById('oldPassword')?.value;
        const newPassword = document.getElementById('newPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;

        if (newPassword !== confirmPassword) {
            return showNotification('两次输入的密码不一致', 'error');
        }
        if (newPassword.length < 6) {
            return showNotification('新密码至少需要6位', 'error');
        }

        try {
            await apiCall('/auth/change-password', 'POST', { oldPassword, newPassword });
            showNotification('密码修改成功，请重新登录', 'success');
            setTimeout(() => logout(), 2000);
        } catch (error) {
            showNotification(error?.message || '修改失败', 'error');
        }
    });

    // 数据导出
    document.getElementById('exportDataBtn')?.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/notes/export/json', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
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

    // 初始化显示
    updateUserEmailDisplay();
    syncAccountUsernameInput();
    syncNotificationEmailInput();
    syncTelegramChatIdInput();
}
