/**
 * Theme 模块 - 主题管理
 */

import { showNotification } from './ui.js';

const STORAGE_KEY = 'theme-preference';

// ==================== 主题管理 ====================
export const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem(STORAGE_KEY) || 'system';
        this.applyTheme(savedTheme);
        this.updateIcon(savedTheme);

        // 监听系统主题变化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (localStorage.getItem(STORAGE_KEY) === 'system') {
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
            if (!icon) return;

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
        const current = localStorage.getItem(STORAGE_KEY) || 'system';
        // 循环: light -> dark -> system -> light
        const next = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
        localStorage.setItem(STORAGE_KEY, next);
        this.applyTheme(next);
        this.updateIcon(next);

        const themeNames = { light: '亮色模式', dark: '暗色模式', system: '跟随系统' };
        showNotification(`已切换到${themeNames[next]}`, 'success');
    }
};

// ==================== 初始化主题事件 ====================
export function initThemeEvents() {
    document.getElementById('themeBtn')?.addEventListener('click', () => ThemeManager.toggle());
    document.getElementById('mobileThemeBtn')?.addEventListener('click', () => ThemeManager.toggle());
}
