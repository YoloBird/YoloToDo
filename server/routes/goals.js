const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../utils/db');

const router = express.Router();

const createId = () => Date.now().toString() + Math.random().toString(36).slice(2, 9);

const normalizeTags = (tags) => {
    if (Array.isArray(tags)) {
        return tags.map(t => String(t).trim()).filter(Boolean);
    }
    if (typeof tags === 'string') {
        return tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    return [];
};

const normalizeStatus = (status) => {
    const allowed = ['active', 'paused', 'completed'];
    return allowed.includes(status) ? status : 'active';
};

const normalizeType = (type) => {
    const allowed = ['inspiration', 'insight', 'resource'];
    return allowed.includes(type) ? type : 'inspiration';
};

const clampProgress = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(100, Math.round(number)));
};

// All routes require auth
router.use(authenticateToken);

// Get all goals
router.get('/', (req, res) => {
    try {
        const goals = db.getGoalsByUserId(req.user.id);
        res.json(goals);
    } catch (error) {
        console.error('Get goals error:', error);
        res.status(500).json({ error: '获取目标列表失败' });
    }
});

// Get single goal
router.get('/:id', (req, res) => {
    try {
        const goal = db.getGoalById(req.params.id, req.user.id);
        if (!goal) {
            return res.status(404).json({ error: '目标不存在' });
        }
        res.json(goal);
    } catch (error) {
        console.error('Get goal error:', error);
        res.status(500).json({ error: '获取目标失败' });
    }
});

// Create goal
router.post('/', (req, res) => {
    try {
        const { title, vision, category, tags, status, startDate, targetDate, progress } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: '目标名称不能为空' });
        }

        const goal = {
            id: createId(),
            userId: req.user.id,
            title: title.trim(),
            vision: vision && vision.trim() ? vision.trim() : '',
            category: category && category.trim() ? category.trim() : '',
            tags: normalizeTags(tags),
            status: normalizeStatus(status),
            startDate: startDate || null,
            targetDate: targetDate || null,
            progress: clampProgress(progress),
            records: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        db.addGoal(goal);
        res.status(201).json(goal);
    } catch (error) {
        console.error('Create goal error:', error);
        res.status(500).json({ error: '创建目标失败' });
    }
});

// Update goal
router.put('/:id', (req, res) => {
    try {
        const goal = db.getGoalById(req.params.id, req.user.id);
        if (!goal) {
            return res.status(404).json({ error: '目标不存在' });
        }

        const { title, vision, category, tags, status, startDate, targetDate, progress } = req.body;

        if (title !== undefined && (!title || !title.trim())) {
            return res.status(400).json({ error: '目标名称不能为空' });
        }

        const updatedGoal = {
            ...goal,
            title: title !== undefined ? title.trim() : goal.title,
            vision: vision !== undefined ? vision.trim() : goal.vision,
            category: category !== undefined ? category.trim() : goal.category,
            tags: tags !== undefined ? normalizeTags(tags) : goal.tags,
            status: status !== undefined ? normalizeStatus(status) : goal.status,
            startDate: startDate !== undefined ? startDate : goal.startDate,
            targetDate: targetDate !== undefined ? targetDate : goal.targetDate,
            progress: progress !== undefined ? clampProgress(progress) : goal.progress,
            records: goal.records || [],
            updatedAt: new Date().toISOString()
        };

        db.updateGoal(req.params.id, updatedGoal);
        res.json(updatedGoal);
    } catch (error) {
        console.error('Update goal error:', error);
        res.status(500).json({ error: '更新目标失败' });
    }
});

// Delete goal
router.delete('/:id', (req, res) => {
    try {
        const goal = db.getGoalById(req.params.id, req.user.id);
        if (!goal) {
            return res.status(404).json({ error: '目标不存在' });
        }

        db.deleteGoal(req.params.id);
        res.json({ message: '删除成功' });
    } catch (error) {
        console.error('Delete goal error:', error);
        res.status(500).json({ error: '删除目标失败' });
    }
});

// Add goal record
router.post('/:id/records', (req, res) => {
    try {
        const goal = db.getGoalById(req.params.id, req.user.id);
        if (!goal) {
            return res.status(404).json({ error: '目标不存在' });
        }

        const { title, content, type, tags, date } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: '记录内容不能为空' });
        }

        const dateValue = date ? new Date(date) : new Date();
        const safeDate = Number.isNaN(dateValue.getTime()) ? new Date() : dateValue;

        const record = {
            id: createId(),
            title: title && title.trim() ? title.trim() : '灵感记录',
            content: content.trim(),
            type: normalizeType(type),
            tags: normalizeTags(tags),
            date: safeDate.toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const updatedGoal = {
            ...goal,
            records: [...(goal.records || []), record],
            updatedAt: new Date().toISOString()
        };

        db.updateGoal(req.params.id, updatedGoal);
        res.status(201).json(record);
    } catch (error) {
        console.error('Add goal record error:', error);
        res.status(500).json({ error: '创建记录失败' });
    }
});

// Update goal record
router.put('/:id/records/:recordId', (req, res) => {
    try {
        const goal = db.getGoalById(req.params.id, req.user.id);
        if (!goal) {
            return res.status(404).json({ error: '目标不存在' });
        }

        const records = goal.records || [];
        const recordIndex = records.findIndex(r => r.id === req.params.recordId);
        if (recordIndex === -1) {
            return res.status(404).json({ error: '记录不存在' });
        }

        const { title, content, type, tags, date } = req.body;

        if (content !== undefined && (!content || !content.trim())) {
            return res.status(400).json({ error: '记录内容不能为空' });
        }

        const dateValue = date ? new Date(date) : new Date(records[recordIndex].date);
        const safeDate = Number.isNaN(dateValue.getTime()) ? new Date(records[recordIndex].date) : dateValue;

        records[recordIndex] = {
            ...records[recordIndex],
            title: title !== undefined ? (title.trim() || records[recordIndex].title) : records[recordIndex].title,
            content: content !== undefined ? content.trim() : records[recordIndex].content,
            type: type !== undefined ? normalizeType(type) : records[recordIndex].type,
            tags: tags !== undefined ? normalizeTags(tags) : records[recordIndex].tags,
            date: safeDate.toISOString(),
            updatedAt: new Date().toISOString()
        };

        const updatedGoal = {
            ...goal,
            records,
            updatedAt: new Date().toISOString()
        };

        db.updateGoal(req.params.id, updatedGoal);
        res.json(records[recordIndex]);
    } catch (error) {
        console.error('Update goal record error:', error);
        res.status(500).json({ error: '更新记录失败' });
    }
});

// Delete goal record
router.delete('/:id/records/:recordId', (req, res) => {
    try {
        const goal = db.getGoalById(req.params.id, req.user.id);
        if (!goal) {
            return res.status(404).json({ error: '目标不存在' });
        }

        const records = goal.records || [];
        const updatedRecords = records.filter(r => r.id !== req.params.recordId);
        if (updatedRecords.length === records.length) {
            return res.status(404).json({ error: '记录不存在' });
        }

        const updatedGoal = {
            ...goal,
            records: updatedRecords,
            updatedAt: new Date().toISOString()
        };

        db.updateGoal(req.params.id, updatedGoal);
        res.json({ message: '删除成功' });
    } catch (error) {
        console.error('Delete goal record error:', error);
        res.status(500).json({ error: '删除记录失败' });
    }
});

module.exports = router;
