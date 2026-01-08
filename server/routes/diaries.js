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

// All routes require auth
router.use(authenticateToken);

// Get all diaries
router.get('/', (req, res) => {
    try {
        const diaries = db.getDiariesByUserId(req.user.id);
        res.json(diaries);
    } catch (error) {
        console.error('Get diaries error:', error);
        res.status(500).json({ error: '获取日记列表失败' });
    }
});

// Get single diary
router.get('/:id', (req, res) => {
    try {
        const diary = db.getDiaryById(req.params.id, req.user.id);
        if (!diary) {
            return res.status(404).json({ error: '日记不存在' });
        }
        res.json(diary);
    } catch (error) {
        console.error('Get diary error:', error);
        res.status(500).json({ error: '获取日记失败' });
    }
});

// Create diary
router.post('/', (req, res) => {
    try {
        const { title, content, mood, weather, tags, entryDate } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: '内容不能为空' });
        }

        const dateValue = entryDate ? new Date(entryDate) : new Date();
        const safeDate = Number.isNaN(dateValue.getTime()) ? new Date() : dateValue;
        const dateLabel = safeDate.toISOString().split('T')[0];

        const diary = {
            id: createId(),
            userId: req.user.id,
            title: title && title.trim() ? title.trim() : `${dateLabel} 日记`,
            content: content.trim(),
            mood: mood && mood.trim() ? mood.trim() : '平静',
            weather: weather && weather.trim() ? weather.trim() : '',
            tags: normalizeTags(tags),
            entryDate: safeDate.toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        db.addDiary(diary);
        res.status(201).json(diary);
    } catch (error) {
        console.error('Create diary error:', error);
        res.status(500).json({ error: '创建日记失败' });
    }
});

// Update diary
router.put('/:id', (req, res) => {
    try {
        const diary = db.getDiaryById(req.params.id, req.user.id);
        if (!diary) {
            return res.status(404).json({ error: '日记不存在' });
        }

        const { title, content, mood, weather, tags, entryDate } = req.body;

        if (content !== undefined && (!content || !content.trim())) {
            return res.status(400).json({ error: '内容不能为空' });
        }

        const dateValue = entryDate ? new Date(entryDate) : new Date(diary.entryDate);
        const safeDate = Number.isNaN(dateValue.getTime()) ? new Date(diary.entryDate) : dateValue;

        const updatedDiary = {
            ...diary,
            title: title !== undefined ? (title.trim() || diary.title) : diary.title,
            content: content !== undefined ? content.trim() : diary.content,
            mood: mood !== undefined ? (mood.trim() || diary.mood) : diary.mood,
            weather: weather !== undefined ? weather.trim() : diary.weather,
            tags: tags !== undefined ? normalizeTags(tags) : diary.tags,
            entryDate: safeDate.toISOString(),
            updatedAt: new Date().toISOString()
        };

        db.updateDiary(req.params.id, updatedDiary);
        res.json(updatedDiary);
    } catch (error) {
        console.error('Update diary error:', error);
        res.status(500).json({ error: '更新日记失败' });
    }
});

// Delete diary
router.delete('/:id', (req, res) => {
    try {
        const diary = db.getDiaryById(req.params.id, req.user.id);
        if (!diary) {
            return res.status(404).json({ error: '日记不存在' });
        }

        db.deleteDiary(req.params.id);
        res.json({ message: '删除成功' });
    } catch (error) {
        console.error('Delete diary error:', error);
        res.status(500).json({ error: '删除日记失败' });
    }
});

module.exports = router;
