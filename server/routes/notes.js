const express = require('express');
const {
    getNotesByUserId,
    getArchivedNotesByUserId,
    getNoteById,
    addNote,
    updateNote,
    deleteNote,
    archiveNote,
    unarchiveNote,
    completeAllNotes,
    exportNotes,
    importNotes
} = require('../utils/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ==================== 所有路由需要认证 ====================
router.use(authenticateToken);

// ==================== 获取便签列表 ====================
/**
 * GET /api/notes
 * 获取当前用户的所有便签
 */
router.get('/', (req, res) => {
    try {
        const notes = getNotesByUserId(req.user.id);
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: '获取便签失败' });
    }
});

// ==================== 获取归档便签（必须在/:id之前） ====================
/**
 * GET /api/notes/archived
 * 获取所有已归档的便签
 */
router.get('/archived', (req, res) => {
    try {
        const notes = getArchivedNotesByUserId(req.user.id);
        res.json(notes);
    } catch (error) {
        console.error('Error fetching archived notes:', error);
        res.status(500).json({ error: '获取归档便签失败' });
    }
});

// ==================== 获取单个便签 ====================
/**
 * GET /api/notes/:id
 * 获取指定ID的便签
 */
router.get('/:id', (req, res) => {
    try {
        const note = getNoteById(req.params.id);

        if (!note) {
            return res.status(404).json({ error: '便签不存在' });
        }

        // 检查便签所有权
        if (note.userId !== req.user.id) {
            return res.status(403).json({ error: '无权访问此便签' });
        }

        res.json(note);
    } catch (error) {
        console.error('Error fetching note:', error);
        res.status(500).json({ error: '获取便签失败' });
    }
});

// ==================== 创建便签 ====================
/**
 * POST /api/notes
 * 创建新便签
 * 字段：title(必填), content(必填), format, color, tags, isImportant,
 *       category, priority, dueDate, reminderDate, reminderMethods
 */
router.post('/', (req, res) => {
    try {
        const {
            title,
            content,
            format,        // 'text' 或 'markdown'
            color,         // 便签颜色
            tags,          // 标签数组
            isImportant,   // 是否重要
            category,
            priority,
            dueDate,
            reminderDate,
            reminderMethods,
            subtasks       // 子任务数组
        } = req.body;

        // 验证必填字段
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: '标题不能为空' });
        }

        if (!content || content.trim() === '') {
            return res.status(400).json({ error: '内容不能为空' });
        }

        // 创建便签对象
        const newNote = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            userId: req.user.id,
            title: title.trim(),
            content: content.trim(),
            format: format || 'text',  // 默认纯文本
            color: color || null,
            tags: tags || [],
            isImportant: isImportant || false,
            category: category || null,
            priority: priority || 'medium',
            dueDate: dueDate || null,
            reminderDate: reminderDate || null,
            reminderMethods: reminderMethods || [],
            subtasks: (subtasks || []).map((st, idx) => ({
                id: `${Date.now()}_${idx}`,
                text: st.text || st,
                completed: st.completed || false
            })),
            reminderSent: false,
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        addNote(newNote);
        res.status(201).json(newNote);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: '创建便签失败' });
    }
});

// ==================== 更新便签 ====================
/**
 * PUT /api/notes/:id
 * 更新指定便签
 */
router.put('/:id', (req, res) => {
    try {
        const note = getNoteById(req.params.id);

        if (!note) {
            return res.status(404).json({ error: '便签不存在' });
        }

        if (note.userId !== req.user.id) {
            return res.status(403).json({ error: '无权修改此便签' });
        }

        // 验证必填字段
        if (req.body.title !== undefined && req.body.title.trim() === '') {
            return res.status(400).json({ error: '标题不能为空' });
        }

        if (req.body.content !== undefined && req.body.content.trim() === '') {
            return res.status(400).json({ error: '内容不能为空' });
        }

        const updatedData = {
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        // 如果提醒时间更新，重置reminderSent
        if (req.body.reminderDate && req.body.reminderDate !== note.reminderDate) {
            updatedData.reminderSent = false;
        }

        const success = updateNote(req.params.id, updatedData);

        if (success) {
            const updatedNote = getNoteById(req.params.id);
            res.json(updatedNote);
        } else {
            res.status(500).json({ error: '更新便签失败' });
        }
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ error: '更新便签失败' });
    }
});

// ==================== 删除便签 ====================
/**
 * DELETE /api/notes/:id
 * 删除指定便签
 */
router.delete('/:id', (req, res) => {
    try {
        const note = getNoteById(req.params.id);

        if (!note) {
            return res.status(404).json({ error: '便签不存在' });
        }

        if (note.userId !== req.user.id) {
            return res.status(403).json({ error: '无权删除此便签' });
        }

        const success = deleteNote(req.params.id);

        if (success) {
            res.json({ message: '便签已删除' });
        } else {
            res.status(500).json({ error: '删除便签失败' });
        }
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: '删除便签失败' });
    }
});

// ==================== 切换完成状态 ====================
/**
 * PATCH /api/notes/:id/toggle
 * 切换便签的完成状态
 */
router.patch('/:id/toggle', (req, res) => {
    try {
        const note = getNoteById(req.params.id);

        if (!note) {
            return res.status(404).json({ error: '便签不存在' });
        }

        if (note.userId !== req.user.id) {
            return res.status(403).json({ error: '无权修改此便签' });
        }

        const success = updateNote(req.params.id, {
            completed: !note.completed,
            updatedAt: new Date().toISOString()
        });

        if (success) {
            const updatedNote = getNoteById(req.params.id);
            res.json(updatedNote);
        } else {
            res.status(500).json({ error: '更新便签失败' });
        }
    } catch (error) {
        console.error('Error toggling note:', error);
        res.status(500).json({ error: '更新便签失败' });
    }
});

// ==================== 切换子任务状态 ====================
/**
 * PATCH /api/notes/:id/subtask/:subtaskId
 * 切换子任务的完成状态
 */
router.patch('/:id/subtask/:subtaskId', (req, res) => {
    try {
        const note = getNoteById(req.params.id);

        if (!note) {
            return res.status(404).json({ error: '便签不存在' });
        }

        if (note.userId !== req.user.id) {
            return res.status(403).json({ error: '无权修改此便签' });
        }

        const subtasks = note.subtasks || [];
        const subtaskIndex = subtasks.findIndex(st => st.id === req.params.subtaskId);

        if (subtaskIndex === -1) {
            return res.status(404).json({ error: '子任务不存在' });
        }

        subtasks[subtaskIndex].completed = !subtasks[subtaskIndex].completed;

        const success = updateNote(req.params.id, {
            subtasks,
            updatedAt: new Date().toISOString()
        });

        if (success) {
            const updatedNote = getNoteById(req.params.id);
            res.json(updatedNote);
        } else {
            res.status(500).json({ error: '更新子任务失败' });
        }
    } catch (error) {
        console.error('Error toggling subtask:', error);
        res.status(500).json({ error: '更新子任务失败' });
    }
});

// ==================== 一键完成所有 ====================
/**
 * POST /api/notes/complete-all
 * 将所有未完成的便签标记为已完成
 */
router.post('/complete-all', (req, res) => {
    try {
        const success = completeAllNotes(req.user.id);

        if (success) {
            res.json({ message: '所有便签已标记为完成' });
        } else {
            res.status(500).json({ error: '操作失败' });
        }
    } catch (error) {
        console.error('Error completing all notes:', error);
        res.status(500).json({ error: '操作失败' });
    }
});

// ==================== 归档操作 ====================
/**
 * POST /api/notes/:id/archive
 * 归档指定便签
 */
router.post('/:id/archive', (req, res) => {
    try {
        const note = getNoteById(req.params.id);

        if (!note) {
            return res.status(404).json({ error: '便签不存在' });
        }

        if (note.userId !== req.user.id) {
            return res.status(403).json({ error: '无权操作此便签' });
        }

        const success = archiveNote(req.params.id);

        if (success) {
            const updatedNote = getNoteById(req.params.id);
            res.json(updatedNote);
        } else {
            res.status(500).json({ error: '归档失败' });
        }
    } catch (error) {
        console.error('Error archiving note:', error);
        res.status(500).json({ error: '归档失败' });
    }
});

/**
 * POST /api/notes/:id/unarchive
 * 取消归档（恢复）指定便签
 */
router.post('/:id/unarchive', (req, res) => {
    try {
        const note = getNoteById(req.params.id);

        if (!note) {
            return res.status(404).json({ error: '便签不存在' });
        }

        if (note.userId !== req.user.id) {
            return res.status(403).json({ error: '无权操作此便签' });
        }

        const success = unarchiveNote(req.params.id);

        if (success) {
            const updatedNote = getNoteById(req.params.id);
            res.json(updatedNote);
        } else {
            res.status(500).json({ error: '恢复失败' });
        }
    } catch (error) {
        console.error('Error unarchiving note:', error);
        res.status(500).json({ error: '恢复失败' });
    }
});

// ==================== 导出便签 ====================
/**
 * GET /api/notes/export
 * 导出所有便签为JSON格式
 */
router.get('/export/json', (req, res) => {
    try {
        const notes = exportNotes(req.user.id);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `notes_${timestamp}_${Date.now()}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(notes);
    } catch (error) {
        console.error('Error exporting notes:', error);
        res.status(500).json({ error: '导出失败' });
    }
});

// ==================== 导入便签 ====================
/**
 * POST /api/notes/import
 * 导入便签
 * Body: { notes: [], strategy: 'merge' | 'replace' }
 */
router.post('/import', (req, res) => {
    try {
        const { notes, strategy } = req.body;

        // 验证输入
        if (!notes || !Array.isArray(notes)) {
            return res.status(400).json({ error: '无效的导入数据' });
        }

        if (strategy && !['merge', 'replace'].includes(strategy)) {
            return res.status(400).json({ error: '无效的导入策略' });
        }

        // 验证每个便签的必填字段
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            if (!note.title || note.title.trim() === '') {
                return res.status(400).json({
                    error: `第 ${i + 1} 条便签标题不能为空`
                });
            }
            if (!note.content || note.content.trim() === '') {
                return res.status(400).json({
                    error: `第 ${i + 1} 条便签内容不能为空`
                });
            }
        }

        const success = importNotes(req.user.id, notes, strategy || 'merge');

        if (success) {
            const importedCount = notes.length;
            res.json({
                message: `成功导入 ${importedCount} 条便签`,
                count: importedCount,
                strategy: strategy || 'merge'
            });
        } else {
            res.status(500).json({ error: '导入失败' });
        }
    } catch (error) {
        console.error('Error importing notes:', error);
        res.status(500).json({ error: '导入失败' });
    }
});

module.exports = router;
