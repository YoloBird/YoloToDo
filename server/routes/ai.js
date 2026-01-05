/**
 * AI Routes - AI功能相关API
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getNotes } = require('../utils/db');
const {
    getAIConfig,
    saveAIConfig,
    maskApiKey,
    testConnection,
    callAI,
    getConversations,
    getConversation,
    createConversation,
    addMessage,
    updateConversationTitle,
    deleteConversation,
    SYSTEM_PROMPTS,
    buildContext
} = require('../utils/ai');

// 所有路由需要认证
router.use(authenticateToken);

// ==================== 配置管理 ====================

/**
 * GET /api/ai/config
 * 获取AI配置（API Key脱敏）
 */
router.get('/config', (req, res) => {
    try {
        const config = getAIConfig();
        res.json({
            enabled: config.enabled,
            provider: {
                baseUrl: config.provider.baseUrl,
                apiKey: maskApiKey(config.provider.apiKey),
                model: config.provider.model,
                hasApiKey: !!config.provider.apiKey
            },
            preferences: config.preferences
        });
    } catch (error) {
        console.error('获取AI配置失败:', error);
        res.status(500).json({ error: '获取配置失败' });
    }
});

/**
 * POST /api/ai/config
 * 保存AI配置
 */
router.post('/config', (req, res) => {
    try {
        const { baseUrl, apiKey, model, preferences, enabled } = req.body;

        const currentConfig = getAIConfig();

        const newConfig = {
            enabled: enabled !== undefined ? enabled : currentConfig.enabled,
            provider: {
                baseUrl: baseUrl || currentConfig.provider.baseUrl,
                // 如果apiKey是脱敏的（包含****），保留原来的
                apiKey: (apiKey && !apiKey.includes('****')) ? apiKey : currentConfig.provider.apiKey,
                model: model || currentConfig.provider.model
            },
            preferences: preferences || currentConfig.preferences
        };

        if (saveAIConfig(newConfig)) {
            res.json({
                success: true,
                message: '配置已保存',
                config: {
                    enabled: newConfig.enabled,
                    provider: {
                        baseUrl: newConfig.provider.baseUrl,
                        apiKey: maskApiKey(newConfig.provider.apiKey),
                        model: newConfig.provider.model,
                        hasApiKey: !!newConfig.provider.apiKey
                    },
                    preferences: newConfig.preferences
                }
            });
        } else {
            res.status(500).json({ error: '保存配置失败' });
        }
    } catch (error) {
        console.error('保存AI配置失败:', error);
        res.status(500).json({ error: '保存配置失败' });
    }
});

/**
 * POST /api/ai/config/test
 * 测试AI连接
 */
router.post('/config/test', async (req, res) => {
    try {
        const { baseUrl, apiKey, model } = req.body;

        const testConfig = {
            enabled: true,
            provider: { baseUrl, apiKey, model }
        };

        const result = await testConnection(testConfig);
        res.json(result);
    } catch (error) {
        console.error('测试连接失败:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== 对话管理 ====================

/**
 * GET /api/ai/conversations
 * 获取对话列表
 */
router.get('/conversations', (req, res) => {
    try {
        const conversations = getConversations(req.user.id);
        res.json(conversations);
    } catch (error) {
        console.error('获取对话列表失败:', error);
        res.status(500).json({ error: '获取对话列表失败' });
    }
});

/**
 * POST /api/ai/conversations
 * 创建新对话
 */
router.post('/conversations', (req, res) => {
    try {
        const { title } = req.body;
        const conversation = createConversation(req.user.id, title || '新对话');

        if (conversation) {
            res.status(201).json(conversation);
        } else {
            res.status(500).json({ error: '创建对话失败' });
        }
    } catch (error) {
        console.error('创建对话失败:', error);
        res.status(500).json({ error: '创建对话失败' });
    }
});

/**
 * GET /api/ai/conversations/:id
 * 获取对话详情
 */
router.get('/conversations/:id', (req, res) => {
    try {
        const conversation = getConversation(req.user.id, req.params.id);

        if (conversation) {
            res.json(conversation);
        } else {
            res.status(404).json({ error: '对话不存在' });
        }
    } catch (error) {
        console.error('获取对话详情失败:', error);
        res.status(500).json({ error: '获取对话详情失败' });
    }
});

/**
 * PUT /api/ai/conversations/:id
 * 更新对话（标题）
 */
router.put('/conversations/:id', (req, res) => {
    try {
        const { title } = req.body;

        if (updateConversationTitle(req.params.id, title)) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: '对话不存在' });
        }
    } catch (error) {
        console.error('更新对话失败:', error);
        res.status(500).json({ error: '更新对话失败' });
    }
});

/**
 * DELETE /api/ai/conversations/:id
 * 删除对话
 */
router.delete('/conversations/:id', (req, res) => {
    try {
        if (deleteConversation(req.user.id, req.params.id)) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: '对话不存在' });
        }
    } catch (error) {
        console.error('删除对话失败:', error);
        res.status(500).json({ error: '删除对话失败' });
    }
});

/**
 * POST /api/ai/conversations/:id/messages
 * 发送消息并获取AI回复
 */
router.post('/conversations/:id/messages', async (req, res) => {
    try {
        const { message } = req.body;
        const conversationId = req.params.id;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: '消息不能为空' });
        }

        // 检查AI配置
        const config = getAIConfig();
        if (!config.enabled) {
            return res.status(400).json({ error: 'AI服务未启用，请先配置' });
        }

        // 获取对话
        const conversation = getConversation(req.user.id, conversationId);
        if (!conversation) {
            return res.status(404).json({ error: '对话不存在' });
        }

        // 添加用户消息
        const userMessage = addMessage(conversationId, 'user', message);

        // 获取用户数据作为上下文
        const notes = getNotes().filter(n => n.userId === req.user.id);
        const ideas = require('../utils/db').getIdeas().filter(i => i.userId === req.user.id);

        const context = buildContext({ notes, ideas });

        // 构建消息历史（最近10条）
        const recentMessages = conversation.messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
        }));

        // 添加当前用户消息
        recentMessages.push({ role: 'user', content: message });

        // 构建完整消息
        const messages = [
            { role: 'system', content: SYSTEM_PROMPTS.assistant + '\n\n' + context },
            ...recentMessages
        ];

        // 调用AI
        const aiResponse = await callAI(messages);

        // 保存AI回复
        const assistantMessage = addMessage(conversationId, 'assistant', aiResponse);

        // 如果是前几条消息，自动生成标题
        const updatedConversation = getConversation(req.user.id, conversationId);
        if (updatedConversation.messages.length === 2 && updatedConversation.title === '新对话') {
            // 异步生成标题
            generateTitle(conversationId, message, aiResponse).catch(console.error);
        }

        res.json({
            userMessage,
            assistantMessage
        });
    } catch (error) {
        console.error('发送消息失败:', error);
        res.status(500).json({ error: error.message || '发送消息失败' });
    }
});

/**
 * 自动生成对话标题
 */
async function generateTitle(conversationId, userMessage, aiResponse) {
    try {
        const prompt = `根据以下对话，生成一个简短的标题（不超过10个字，只返回标题文字）：

用户: ${userMessage}
助手: ${aiResponse.substring(0, 200)}`;

        const title = await callAI([{ role: 'user', content: prompt }]);
        const cleanTitle = title.replace(/["""'']/g, '').trim().substring(0, 20);
        updateConversationTitle(conversationId, cleanTitle);
    } catch (error) {
        console.error('生成标题失败:', error);
    }
}

// ==================== 智能解析 ====================

/**
 * POST /api/ai/parse
 * 解析自然语言输入
 */
router.post('/parse', async (req, res) => {
    try {
        const { input } = req.body;

        if (!input || !input.trim()) {
            return res.status(400).json({ error: '输入不能为空' });
        }

        const config = getAIConfig();
        if (!config.enabled) {
            return res.status(400).json({ error: 'AI服务未启用' });
        }

        // 获取当前日期信息用于时间解析
        const now = new Date();
        const dateInfo = `当前时间: ${now.toISOString()}, 星期${['日', '一', '二', '三', '四', '五', '六'][now.getDay()]}`;

        const messages = [
            { role: 'system', content: SYSTEM_PROMPTS.parse.replace('${new Date().toISOString().split(\'T\')[0]}', now.toISOString().split('T')[0]) + '\n\n' + dateInfo },
            { role: 'user', content: input }
        ];

        const response = await callAI(messages);

        // 尝试解析JSON
        let parsed;
        try {
            // 尝试提取JSON部分
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('无法解析响应');
            }
        } catch (parseError) {
            // 如果解析失败，返回基本结果
            parsed = {
                type: 'note',
                confidence: 0.5,
                data: {
                    title: input.substring(0, 50),
                    content: input,
                    category: '其他',
                    priority: 'medium'
                },
                fallback: true,
                rawResponse: response
            };
        }

        res.json({
            success: true,
            parsed
        });
    } catch (error) {
        console.error('解析失败:', error);
        res.status(500).json({ error: error.message || '解析失败' });
    }
});

// ==================== 周报生成 ====================

/**
 * GET /api/ai/weekly-report
 * 生成周报
 */
router.get('/weekly-report', async (req, res) => {
    try {
        const config = getAIConfig();
        if (!config.enabled) {
            return res.status(400).json({ error: 'AI服务未启用' });
        }

        // 获取本周数据
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
        weekStart.setHours(0, 0, 0, 0);

        const notes = getNotes().filter(n => n.userId === req.user.id);
        const ideas = require('../utils/db').getIdeas().filter(i => i.userId === req.user.id);

        const weekNotes = notes.filter(n => new Date(n.createdAt) >= weekStart);
        const weekIdeas = ideas.filter(i => new Date(i.createdAt) >= weekStart);
        const weekCompleted = weekNotes.filter(n => n.completed);

        const stats = {
            total: weekNotes.length,
            completed: weekCompleted.length,
            ideas: weekIdeas.length,
            rate: weekNotes.length > 0 ? Math.round((weekCompleted.length / weekNotes.length) * 100) : 0
        };

        const context = `本周数据统计：
- 新建任务：${stats.total}个
- 完成任务：${stats.completed}个
- 完成率：${stats.rate}%
- 记录想法：${stats.ideas}个

任务列表：
${weekNotes.map(n => `- [${n.completed ? '✅' : '⬜'}] ${n.title} (${n.priority}优先级)`).join('\n')}

想法记录：
${weekIdeas.map(i => `- 💡 ${i.title}`).join('\n')}`;

        const messages = [
            { role: 'system', content: SYSTEM_PROMPTS.weeklyReport },
            { role: 'user', content: context }
        ];

        const report = await callAI(messages);

        res.json({
            success: true,
            stats,
            report
        });
    } catch (error) {
        console.error('生成周报失败:', error);
        res.status(500).json({ error: error.message || '生成周报失败' });
    }
});

module.exports = router;
