const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const db = require('../utils/db');

// Get all ideas for user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const ideas = await db.getIdeasByUserId(req.user.id);
        res.json(ideas);
    } catch (error) {
        console.error('Get ideas error:', error);
        res.status(500).json({ error: '获取想法列表失败' });
    }
});

// Get single idea
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const idea = await db.getIdeaById(req.params.id, req.user.id);
        if (!idea) {
            return res.status(404).json({ error: '想法不存在' });
        }
        res.json(idea);
    } catch (error) {
        console.error('Get idea error:', error);
        res.status(500).json({ error: '获取想法失败' });
    }
});

// Create idea
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { title, content, category, tags, color } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: '标题不能为空' });
        }

        if (!content || !content.trim()) {
            return res.status(400).json({ error: '内容不能为空' });
        }

        const idea = {
            id: uuidv4(),
            userId: req.user.id,
            title: title.trim(),
            content: content.trim(),
            category: category || '灵感',
            tags: tags || [],
            color: color || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await db.addIdea(idea);
        res.status(201).json(idea);
    } catch (error) {
        console.error('Create idea error:', error);
        res.status(500).json({ error: '创建想法失败' });
    }
});

// Update idea
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const idea = await db.getIdeaById(req.params.id, req.user.id);
        if (!idea) {
            return res.status(404).json({ error: '想法不存在' });
        }

        const { title, content, category, tags, color } = req.body;

        if (title !== undefined && (!title || !title.trim())) {
            return res.status(400).json({ error: '标题不能为空' });
        }

        if (content !== undefined && (!content || !content.trim())) {
            return res.status(400).json({ error: '内容不能为空' });
        }

        const updatedIdea = {
            ...idea,
            title: title !== undefined ? title.trim() : idea.title,
            content: content !== undefined ? content.trim() : idea.content,
            category: category !== undefined ? category : idea.category,
            tags: tags !== undefined ? tags : idea.tags,
            color: color !== undefined ? color : idea.color,
            updatedAt: new Date().toISOString()
        };

        await db.updateIdea(req.params.id, updatedIdea);
        res.json(updatedIdea);
    } catch (error) {
        console.error('Update idea error:', error);
        res.status(500).json({ error: '更新想法失败' });
    }
});

// Delete idea
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const idea = await db.getIdeaById(req.params.id, req.user.id);
        if (!idea) {
            return res.status(404).json({ error: '想法不存在' });
        }

        await db.deleteIdea(req.params.id);
        res.json({ message: '删除成功' });
    } catch (error) {
        console.error('Delete idea error:', error);
        res.status(500).json({ error: '删除想法失败' });
    }
});

// Export ideas
router.get('/export/json', authenticateToken, async (req, res) => {
    try {
        const ideas = await db.getIdeasByUserId(req.user.id);
        const filename = `ideas_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(ideas);
    } catch (error) {
        console.error('Export ideas error:', error);
        res.status(500).json({ error: '导出失败' });
    }
});

// Import ideas
router.post('/import', authenticateToken, async (req, res) => {
    try {
        const { ideas: importedIdeas, strategy = 'merge' } = req.body;

        if (!Array.isArray(importedIdeas)) {
            return res.status(400).json({ error: '无效的数据格式' });
        }

        // Validate each idea
        for (let i = 0; i < importedIdeas.length; i++) {
            const idea = importedIdeas[i];
            if (!idea.title || !idea.title.trim()) {
                return res.status(400).json({ error: `第 ${i + 1} 条想法标题不能为空` });
            }
            if (!idea.content || !idea.content.trim()) {
                return res.status(400).json({ error: `第 ${i + 1} 条想法内容不能为空` });
            }
        }

        if (strategy === 'replace') {
            await db.deleteAllIdeasByUserId(req.user.id);
        }

        const now = new Date().toISOString();
        for (const importedIdea of importedIdeas) {
            const idea = {
                id: uuidv4(),
                userId: req.user.id,
                title: importedIdea.title.trim(),
                content: importedIdea.content.trim(),
                category: importedIdea.category || '灵感',
                tags: importedIdea.tags || [],
                color: importedIdea.color || null,
                createdAt: importedIdea.createdAt || now,
                updatedAt: now
            };
            await db.addIdea(idea);
        }

        res.json({
            message: `成功导入 ${importedIdeas.length} 条想法`,
            count: importedIdeas.length,
            strategy
        });
    } catch (error) {
        console.error('Import ideas error:', error);
        res.status(500).json({ error: '导入失败' });
    }
});

module.exports = router;
