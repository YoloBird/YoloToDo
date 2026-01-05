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

    // Initialize notes file
    if (!fs.existsSync(notesFile)) {
        fs.writeFileSync(notesFile, JSON.stringify([], null, 2));
    }

    // Initialize ideas file
    if (!fs.existsSync(ideasFile)) {
        fs.writeFileSync(ideasFile, JSON.stringify([], null, 2));
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

// Get notes by user ID
const getNotesByUserId = (userId) => {
    const notes = getNotes();
    return notes.filter(n => n.userId === userId);
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
    const backupData = { notes, ideas };
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
    getNoteById,
    addNote,
    updateNote,
    deleteNote,
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
    deleteAllIdeasByUserId
};
