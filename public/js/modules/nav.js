/**
 * Navigation 模块 - 导航和页面切换
 */

import { UIState } from './state.js';
import { loadNotes, loadArchivedNotes } from './notes.js';
import { loadIdeas } from './ideas.js';
import { loadDiaries } from './diaries.js';
import { loadGoals } from './goals.js';
import { loadTimeline } from './timeline.js';

// ==================== 移动端导航 ====================
export const MobileNav = {
    sidebar: null,
    overlay: null,
    mobileTitle: null,

    init() {
        this.sidebar = document.getElementById('sidebar');
        this.overlay = document.getElementById('sidebarOverlay');
        this.mobileTitle = document.getElementById('mobileTitle');
    },

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
        const titles = {
            notes: '待办清单',
            ideas: '想法记录',
            diary: '日记',
            goals: '长期目标',
            timeline: '时光看板'
        };
        if (this.mobileTitle) {
            this.mobileTitle.textContent = titles[page] || '智能笔记';
        }
    }
};

// ==================== 页面切换 ====================
export function switchPage(page) {
    UIState.activePage = page;

    // 更新侧边栏导航状态
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.toggle('active', nav.dataset.page === page);
    });

    // 更新底部导航状态（移动端）
    document.querySelectorAll('.bottom-nav-item').forEach(nav => {
        nav.classList.toggle('active', nav.dataset.page === page);
    });

    // 更新移动端标题
    MobileNav.updateTitle(page);

    // 关闭移动端侧边栏
    MobileNav.closeSidebar();

    // 切换页面显示
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === `${page}Page`);
    });

    // 加载对应页面数据
    switch (page) {
        case 'notes':
            loadNotes();
            loadArchivedNotes();
            break;
        case 'ideas':
            loadIdeas();
            break;
        case 'diary':
            loadDiaries();
            break;
        case 'goals':
            loadGoals();
            break;
        case 'timeline':
            loadTimeline();
            break;
    }
}

// ==================== 初始化导航事件 ====================
export function initNavEvents() {
    MobileNav.init();

    // 侧边栏折叠
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
            UIState.sidebarCollapsed = sidebar.classList.contains('collapsed');
        }
    });

    // 侧边栏导航
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (page) switchPage(page);
        });
    });

    // 移动端菜单按钮
    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => MobileNav.openSidebar());

    // 点击遮罩关闭侧边栏
    document.getElementById('sidebarOverlay')?.addEventListener('click', () => MobileNav.closeSidebar());

    // 底部导航
    document.querySelectorAll('.bottom-nav-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (page) switchPage(page);
        });
    });

    // 底部设置按钮
    document.getElementById('bottomSettingsBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('settingsModal')?.classList.add('show');
    });
}
