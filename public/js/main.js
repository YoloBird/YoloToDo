/**
 * 智能笔记系统 - 主入口文件
 * 模块化版本 v3.0
 */

// ==================== 模块导入 ====================
import { checkAuth, getUser } from './modules/api.js';
import { ThemeManager, initThemeEvents } from './modules/theme.js';
import { initNavEvents, switchPage, MobileNav } from './modules/nav.js';
import { initModals, registerModal, initFAB } from './modules/ui.js';
import { initNotesEvents, loadNotes, loadArchivedNotes } from './modules/notes.js';
import { initIdeasEvents, loadIdeas } from './modules/ideas.js';
import { initDiaryEvents, loadDiaries } from './modules/diaries.js';
import { initGoalsEvents, loadGoals } from './modules/goals.js';
import { initTimelineEvents, loadTimeline } from './modules/timeline.js';
import { initSettingsEvents, updateUserEmailDisplay } from './modules/settings.js';

// ==================== 应用初始化 ====================
class App {
    constructor() {
        // 验证登录状态
        if (!checkAuth()) return;

        this.init();
    }

    init() {
        // 初始化主题
        ThemeManager.init();

        // 等待 DOM 加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
        } else {
            this.onDOMReady();
        }
    }

    onDOMReady() {
        // 注册 modals
        this.registerModals();

        // 初始化各模块事件
        initModals();
        initThemeEvents();
        initNavEvents();
        initNotesEvents();
        initIdeasEvents();
        initDiaryEvents();
        initGoalsEvents();
        initTimelineEvents();
        initSettingsEvents();
        initFAB();

        // 更新用户信息显示
        updateUserEmailDisplay();

        // 加载默认页面
        this.loadDefaultPage();

        // 设置定时刷新
        this.setupAutoRefresh();

        console.log('✨ 智能笔记系统已初始化');
    }

    registerModals() {
        const modals = ['noteModal', 'ideaModal', 'diaryModal', 'goalModal', 'goalRecordModal', 'settingsModal'];
        modals.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const name = id.replace('Modal', '');
                registerModal(name, el);
            }
        });
    }

    loadDefaultPage() {
        // 检查 URL hash 或默认加载 notes
        const hash = window.location.hash.replace('#', '');
        const validPages = ['notes', 'ideas', 'diary', 'goals', 'timeline'];
        const page = validPages.includes(hash) ? hash : 'notes';
        switchPage(page);
    }

    setupAutoRefresh() {
        // 每分钟刷新当前页面数据
        setInterval(() => {
            const page = document.querySelector('.page.active')?.id?.replace('Page', '');
            if (page === 'notes') {
                loadNotes();
                loadArchivedNotes();
            }
            else if (page === 'ideas') loadIdeas();
            else if (page === 'diary') loadDiaries();
            else if (page === 'goals') loadGoals();
            else if (page === 'timeline') loadTimeline();
        }, 60000);
    }
}

// ==================== 启动应用 ====================
new App();
