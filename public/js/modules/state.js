/**
 * 应用状态管理模块
 */

// ==================== Notes 状态 ====================
export const NotesState = {
    allNotes: [],
    archivedNotes: [],
    currentFilter: 'all',
    currentSort: 'newest',
    searchQuery: '',
    currentCategory: '',
    currentPage: 1,
    perPage: 9,
    editingNoteId: null,
    selectedColor: null,
    importedData: null,
    viewMode: 'active', // 'active' or 'archived'
    subtasks: [], // 编辑中的子任务列表
    currentView: 'list', // 'list' or 'matrix' - 列表/矩阵视图切换
    activeQuadrant: null // 当前选中的象限筛选 (q1/q2/q3/q4)
};

// ==================== Ideas 状态 ====================
export const IdeasState = {
    allIdeas: [],
    searchQuery: '',
    category: '',
    sort: 'newest',
    currentPage: 1,
    perPage: 10,
    editingIdeaId: null,
    selectedColor: null
};

// ==================== Diaries 状态 ====================
export const DiariesState = {
    allDiaries: [],
    searchQuery: '',
    mood: '',
    range: 'all',
    sort: 'newest',
    dateFilter: '',
    currentPage: 1,
    perPage: 9,
    editingDiaryId: null,
    selectedDiaryId: null
};

// ==================== Goals 状态 ====================
export const GoalsState = {
    allGoals: [],
    searchQuery: '',
    status: '',
    recordType: '',
    sort: 'updated',
    editingGoalId: null,
    editingRecordId: null,
    recordGoalId: null,
    selectedGoalId: null
};

// ==================== Timeline 状态 ====================
export const TimelineState = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedDate: new Date(),
    allData: { notes: [], ideas: [] }
};

// ==================== UI 状态 ====================
export const UIState = {
    activePage: 'notes',
    sidebarCollapsed: false
};

// ==================== 状态重置 ====================
export function resetNotesState() {
    NotesState.allNotes = [];
    NotesState.archivedNotes = [];
    NotesState.currentFilter = 'all';
    NotesState.currentSort = 'newest';
    NotesState.searchQuery = '';
    NotesState.currentCategory = '';
    NotesState.currentPage = 1;
    NotesState.editingNoteId = null;
    NotesState.selectedColor = null;
    NotesState.viewMode = 'active';
}

export function resetIdeasState() {
    IdeasState.allIdeas = [];
    IdeasState.searchQuery = '';
    IdeasState.category = '';
    IdeasState.sort = 'newest';
    IdeasState.currentPage = 1;
    IdeasState.editingIdeaId = null;
    IdeasState.selectedColor = null;
}

export function resetDiariesState() {
    DiariesState.allDiaries = [];
    DiariesState.searchQuery = '';
    DiariesState.mood = '';
    DiariesState.range = 'all';
    DiariesState.sort = 'newest';
    DiariesState.dateFilter = '';
    DiariesState.currentPage = 1;
    DiariesState.editingDiaryId = null;
    DiariesState.selectedDiaryId = null;
}

export function resetGoalsState() {
    GoalsState.allGoals = [];
    GoalsState.searchQuery = '';
    GoalsState.status = '';
    GoalsState.recordType = '';
    GoalsState.sort = 'updated';
    GoalsState.editingGoalId = null;
    GoalsState.editingRecordId = null;
    GoalsState.recordGoalId = null;
    GoalsState.selectedGoalId = null;
}
