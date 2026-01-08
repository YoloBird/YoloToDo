const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '../data');
const ADMIN_EMAIL = 'admin@todo.local';
const ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin123';  // 首次登录后请修改

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize data files if they don't exist
const initDataFiles = async () => {
    const usersFile = path.join(DATA_DIR, 'users.json');
    const notesFile = path.join(DATA_DIR, 'notes.json');
    const ideasFile = path.join(DATA_DIR, 'ideas.json');
    const diariesFile = path.join(DATA_DIR, 'diaries.json');
    const goalsFile = path.join(DATA_DIR, 'goals.json');

    // Initialize notes file
    if (!fs.existsSync(notesFile)) {
        fs.writeFileSync(notesFile, JSON.stringify([], null, 2));
    }

    // Initialize ideas file
    if (!fs.existsSync(ideasFile)) {
        fs.writeFileSync(ideasFile, JSON.stringify([], null, 2));
    }

    // Initialize diaries file
    if (!fs.existsSync(diariesFile)) {
        fs.writeFileSync(diariesFile, JSON.stringify([], null, 2));
    }

    // Initialize goals file
    if (!fs.existsSync(goalsFile)) {
        fs.writeFileSync(goalsFile, JSON.stringify([], null, 2));
    }

    // Initialize users file with admin account
    if (!fs.existsSync(usersFile)) {
        const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
        const adminUser = {
            id: 'admin',
            username: ADMIN_USERNAME,
            email: ADMIN_EMAIL,
            password: hashedPassword,
            telegramChatId: null,
            createdAt: new Date().toISOString(),
            isAdmin: true
        };
        fs.writeFileSync(usersFile, JSON.stringify([adminUser], null, 2));
        console.log(`\n⚠️  Default admin account created:`);
        console.log(`   Email: ${ADMIN_EMAIL}`);
        console.log(`   Password: ${DEFAULT_ADMIN_PASSWORD}`);
        console.log(`   ⚡ Please change password after first login!\n`);
    }
};

// Read data from file
const readData = (filename) => {
    try {
        const filePath = path.join(DATA_DIR, filename);
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        return [];
    }
};

// Write data to file
const writeData = (filename, data) => {
    try {
        const filePath = path.join(DATA_DIR, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filename}:`, error);
        return false;
    }
};

// Get all users
const getUsers = () => readData('users.json');

// Get user by email
const getUserByEmail = (email) => {
    const users = getUsers();
    return users.find(u => u.email === email);
};

// Get user by username
const getUserByUsername = (username) => {
    const users = getUsers();
    return users.find(u => u.username === username);
};

// Get user by ID
const getUserById = (id) => {
    const users = getUsers();
    return users.find(u => u.id === id);
};

// Add new user
const addUser = (user) => {
    const users = getUsers();
    users.push(user);
    return writeData('users.json', users);
};

// Update user password
const updateUserPassword = (userId, newHashedPassword) => {
    const users = getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
        users[index].password = newHashedPassword;
        users[index].updatedAt = new Date().toISOString();
        return writeData('users.json', users);
    }
    return false;
};

// Update user settings
const updateUserSettings = (userId, settings) => {
    const users = getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
        users[index] = { ...users[index], ...settings, updatedAt: new Date().toISOString() };
        return writeData('users.json', users);
    }
    return false;
};

// Get all notes
const getNotes = () => readData('notes.json');

// Get notes by user ID (excludes archived by default)
const getNotesByUserId = (userId, includeArchived = false) => {
    const notes = getNotes();
    return notes.filter(n => {
        if (n.userId !== userId) return false;
        if (!includeArchived && n.archived) return false;
        return true;
    });
};

// Get archived notes by user ID
const getArchivedNotesByUserId = (userId) => {
    const notes = getNotes();
    return notes.filter(n => n.userId === userId && n.archived === true);
};

// Archive a note
const archiveNote = (id) => {
    const notes = getNotes();
    const index = notes.findIndex(n => n.id === id);
    if (index !== -1) {
        notes[index].archived = true;
        notes[index].archivedAt = new Date().toISOString();
        notes[index].updatedAt = new Date().toISOString();
        return writeData('notes.json', notes);
    }
    return false;
};

// Unarchive a note
const unarchiveNote = (id) => {
    const notes = getNotes();
    const index = notes.findIndex(n => n.id === id);
    if (index !== -1) {
        notes[index].archived = false;
        notes[index].archivedAt = null;
        notes[index].updatedAt = new Date().toISOString();
        return writeData('notes.json', notes);
    }
    return false;
};

// Get note by ID
const getNoteById = (id) => {
    const notes = getNotes();
    return notes.find(n => n.id === id);
};

// Add new note
const addNote = (note) => {
    const notes = getNotes();
    notes.push(note);
    return writeData('notes.json', notes);
};

// Update note
const updateNote = (id, updatedNote) => {
    const notes = getNotes();
    const index = notes.findIndex(n => n.id === id);
    if (index !== -1) {
        notes[index] = { ...notes[index], ...updatedNote, id };
        return writeData('notes.json', notes);
    }
    return false;
};

// Delete note
const deleteNote = (id) => {
    const notes = getNotes();
    const filteredNotes = notes.filter(n => n.id !== id);
    return writeData('notes.json', filteredNotes);
};

// Get notes with upcoming reminders
const getUpcomingReminders = () => {
    const notes = getNotes();
    const now = new Date();
    return notes.filter(note => {
        if (!note.reminderDate || note.completed || note.reminderSent) {
            return false;
        }
        const reminderDate = new Date(note.reminderDate);
        return reminderDate <= now;
    });
};

// Mark reminder as sent
const markReminderSent = (id) => {
    const notes = getNotes();
    const index = notes.findIndex(n => n.id === id);
    if (index !== -1) {
        notes[index].reminderSent = true;
        return writeData('notes.json', notes);
    }
    return false;
};

// Complete all notes for a user
const completeAllNotes = (userId) => {
    const notes = getNotes();
    const updatedNotes = notes.map(note => {
        if (note.userId === userId && !note.completed) {
            return { ...note, completed: true, updatedAt: new Date().toISOString() };
        }
        return note;
    });
    return writeData('notes.json', updatedNotes);
};

// Export notes for a user
const exportNotes = (userId) => {
    return getNotesByUserId(userId);
};

// Import notes (merge or replace strategy)
const importNotes = (userId, notesToImport, strategy = 'merge') => {
    let notes = getNotes();

    if (strategy === 'replace') {
        // Remove all user's existing notes
        notes = notes.filter(n => n.userId !== userId);
    }

    // Add imported notes
    const timestamp = new Date().toISOString();
    const newNotes = notesToImport.map(note => ({
        ...note,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        userId: userId,
        importedAt: timestamp,
        updatedAt: timestamp
    }));

    notes = [...notes, ...newNotes];
    return writeData('notes.json', notes);
};

// Create backup
const backupData = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupDir = path.join(DATA_DIR, 'backups');

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const notes = getNotes();
    const ideas = getIdeas();
    const diaries = getDiaries();
    const goals = getGoals();
    const backupData = { notes, ideas, diaries, goals };
    const backupFile = path.join(backupDir, `backup_${timestamp}_${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

    // Keep only last 7 backups
    const files = fs.readdirSync(backupDir).sort().reverse();
    if (files.length > 7) {
        files.slice(7).forEach(file => {
            fs.unlinkSync(path.join(backupDir, file));
        });
    }

    return backupFile;
};

// ==================== Ideas Functions ====================

// Get all ideas
const getIdeas = () => readData('ideas.json');

// Get ideas by user ID
const getIdeasByUserId = (userId) => {
    const ideas = getIdeas();
    return ideas.filter(i => i.userId === userId);
};

// Get idea by ID and user ID
const getIdeaById = (id, userId) => {
    const ideas = getIdeas();
    return ideas.find(i => i.id === id && i.userId === userId);
};

// Add new idea
const addIdea = (idea) => {
    const ideas = getIdeas();
    ideas.push(idea);
    return writeData('ideas.json', ideas);
};

// Update idea
const updateIdea = (id, updatedIdea) => {
    const ideas = getIdeas();
    const index = ideas.findIndex(i => i.id === id);
    if (index !== -1) {
        ideas[index] = { ...ideas[index], ...updatedIdea, id };
        return writeData('ideas.json', ideas);
    }
    return false;
};

// Delete idea
const deleteIdea = (id) => {
    const ideas = getIdeas();
    const filteredIdeas = ideas.filter(i => i.id !== id);
    return writeData('ideas.json', filteredIdeas);
};

// Delete all ideas by user ID
const deleteAllIdeasByUserId = (userId) => {
    const ideas = getIdeas();
    const filteredIdeas = ideas.filter(i => i.userId !== userId);
    return writeData('ideas.json', filteredIdeas);
};

// ==================== Diaries Functions ====================

// Get all diaries
const getDiaries = () => readData('diaries.json');

// Get diaries by user ID
const getDiariesByUserId = (userId) => {
    const diaries = getDiaries();
    return diaries.filter(d => d.userId === userId);
};

// Get diary by ID and user ID
const getDiaryById = (id, userId) => {
    const diaries = getDiaries();
    return diaries.find(d => d.id === id && d.userId === userId);
};

// Add new diary
const addDiary = (diary) => {
    const diaries = getDiaries();
    diaries.push(diary);
    return writeData('diaries.json', diaries);
};

// Update diary
const updateDiary = (id, updatedDiary) => {
    const diaries = getDiaries();
    const index = diaries.findIndex(d => d.id === id);
    if (index !== -1) {
        diaries[index] = { ...diaries[index], ...updatedDiary, id };
        return writeData('diaries.json', diaries);
    }
    return false;
};

// Delete diary
const deleteDiary = (id) => {
    const diaries = getDiaries();
    const filteredDiaries = diaries.filter(d => d.id !== id);
    return writeData('diaries.json', filteredDiaries);
};

// ==================== Goals Functions ====================

// Get all goals
const getGoals = () => readData('goals.json');

// Get goals by user ID
const getGoalsByUserId = (userId) => {
    const goals = getGoals();
    return goals.filter(g => g.userId === userId);
};

// Get goal by ID and user ID
const getGoalById = (id, userId) => {
    const goals = getGoals();
    return goals.find(g => g.id === id && g.userId === userId);
};

// Add new goal
const addGoal = (goal) => {
    const goals = getGoals();
    goals.push(goal);
    return writeData('goals.json', goals);
};

// Update goal
const updateGoal = (id, updatedGoal) => {
    const goals = getGoals();
    const index = goals.findIndex(g => g.id === id);
    if (index !== -1) {
        goals[index] = { ...goals[index], ...updatedGoal, id };
        return writeData('goals.json', goals);
    }
    return false;
};

// Delete goal
const deleteGoal = (id) => {
    const goals = getGoals();
    const filteredGoals = goals.filter(g => g.id !== id);
    return writeData('goals.json', filteredGoals);
};

module.exports = {
    initDataFiles,
    getUsers,
    getUserByEmail,
    getUserByUsername,
    getUserById,
    addUser,
    updateUserPassword,
    updateUserSettings,
    getNotes,
    getNotesByUserId,
    getArchivedNotesByUserId,
    getNoteById,
    addNote,
    updateNote,
    deleteNote,
    archiveNote,
    unarchiveNote,
    completeAllNotes,
    getUpcomingReminders,
    markReminderSent,
    exportNotes,
    importNotes,
    backupData,
    // Ideas exports
    getIdeas,
    getIdeasByUserId,
    getIdeaById,
    addIdea,
    updateIdea,
    deleteIdea,
    deleteAllIdeasByUserId,
    // Diaries exports
    getDiaries,
    getDiariesByUserId,
    getDiaryById,
    addDiary,
    updateDiary,
    deleteDiary,
    // Goals exports
    getGoals,
    getGoalsByUserId,
    getGoalById,
    addGoal,
    updateGoal,
    deleteGoal
};
