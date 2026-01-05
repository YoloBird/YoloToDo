/**
 * AI Service - OpenAI Compatible API Client
 * 支持任何兼容 OpenAI 格式的 API
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../data/ai_config.json');
const CONVERSATIONS_FILE = path.join(__dirname, '../data/conversations.json');

// ==================== 配置管理 ====================

/**
 * 获取AI配置
 */
function getAIConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('读取AI配置失败:', error);
    }
    return {
        enabled: false,
        provider: {
            baseUrl: '',
            apiKey: '',
            model: 'gpt-4o-mini'
        },
        preferences: {
            defaultReminderMethods: ['email'],
            autoSuggestReminder: true,
            reminderAdvanceMinutes: 30
        }
    };
}

/**
 * 保存AI配置
 */
function saveAIConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('保存AI配置失败:', error);
        return false;
    }
}

/**
 * 脱敏API Key
 */
function maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 8) return '***';
    return apiKey.substring(0, 6) + '****' + apiKey.substring(apiKey.length - 4);
}

/**
 * 测试AI连接
 */
async function testConnection(config) {
    try {
        const response = await callAI(
            [{ role: 'user', content: '请回复"连接成功"四个字' }],
            config
        );
        return {
            success: true,
            message: '连接成功',
            response: response.substring(0, 50)
        };
    } catch (error) {
        return {
            success: false,
            message: error.message || '连接失败'
        };
    }
}

// ==================== AI 调用 ====================

/**
 * 调用 AI API
 * @param {Array} messages - 消息数组 [{role, content}]
 * @param {Object} configOverride - 可选的配置覆盖
 * @returns {string} AI 响应内容
 */
async function callAI(messages, configOverride = null) {
    const config = configOverride || getAIConfig();

    if (!config.enabled && !configOverride) {
        throw new Error('AI服务未启用，请先配置');
    }

    const { baseUrl, apiKey, model } = config.provider;

    if (!baseUrl || !apiKey) {
        throw new Error('AI配置不完整');
    }

    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model || 'gpt-4o-mini',
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`AI API 错误 (${response.status}): ${errorData}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// ==================== 对话管理 ====================

/**
 * 获取所有对话（摘要）
 */
function getConversations(userId) {
    try {
        if (fs.existsSync(CONVERSATIONS_FILE)) {
            const data = JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, 'utf8'));
            return data.conversations
                .filter(c => c.userId === userId)
                .map(c => ({
                    id: c.id,
                    title: c.title,
                    createdAt: c.createdAt,
                    updatedAt: c.updatedAt,
                    messageCount: c.messages.length
                }))
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        }
    } catch (error) {
        console.error('获取对话列表失败:', error);
    }
    return [];
}

/**
 * 获取单个对话详情
 */
function getConversation(userId, conversationId) {
    try {
        if (fs.existsSync(CONVERSATIONS_FILE)) {
            const data = JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, 'utf8'));
            return data.conversations.find(c => c.id === conversationId && c.userId === userId);
        }
    } catch (error) {
        console.error('获取对话详情失败:', error);
    }
    return null;
}

/**
 * 创建新对话
 */
function createConversation(userId, title = '新对话') {
    try {
        let data = { conversations: [] };
        if (fs.existsSync(CONVERSATIONS_FILE)) {
            data = JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, 'utf8'));
        }

        const conversation = {
            id: 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            userId,
            title,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: []
        };

        data.conversations.push(conversation);
        fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(data, null, 2));

        return conversation;
    } catch (error) {
        console.error('创建对话失败:', error);
        return null;
    }
}

/**
 * 添加消息到对话
 */
function addMessage(conversationId, role, content) {
    try {
        const data = JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, 'utf8'));
        const conversation = data.conversations.find(c => c.id === conversationId);

        if (!conversation) return null;

        const message = {
            id: 'msg_' + Date.now(),
            role,
            content,
            timestamp: new Date().toISOString()
        };

        conversation.messages.push(message);
        conversation.updatedAt = new Date().toISOString();

        fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(data, null, 2));
        return message;
    } catch (error) {
        console.error('添加消息失败:', error);
        return null;
    }
}

/**
 * 更新对话标题
 */
function updateConversationTitle(conversationId, title) {
    try {
        const data = JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, 'utf8'));
        const conversation = data.conversations.find(c => c.id === conversationId);

        if (!conversation) return false;

        conversation.title = title;
        conversation.updatedAt = new Date().toISOString();

        fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('更新对话标题失败:', error);
        return false;
    }
}

/**
 * 删除对话
 */
function deleteConversation(userId, conversationId) {
    try {
        const data = JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, 'utf8'));
        const index = data.conversations.findIndex(c => c.id === conversationId && c.userId === userId);

        if (index === -1) return false;

        data.conversations.splice(index, 1);
        fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('删除对话失败:', error);
        return false;
    }
}

// ==================== 提示词模板 ====================

const SYSTEM_PROMPTS = {
    assistant: `你是一个智能生活管理助手，帮助用户管理待办事项和记录想法。

你的特点：
- 简洁高效：回复简短有力，不啰嗦
- 理解中文：熟悉中国用户的表达习惯和场景
- 主动思考：不只是回答问题，还能提供有价值的建议
- 结构化思维：擅长将模糊的想法转化为可执行的任务

你可以帮助用户：
1. 查询和管理待办事项
2. 规划每日/每周任务
3. 分析效率趋势
4. 整理和延伸想法

请用友好、专业的语气回复。`,

    parse: `你是一个智能输入解析器。用户会用自然语言描述一个任务或想法，你需要解析并提取结构化信息。

请分析用户输入，返回以下JSON格式（严格JSON，不要有其他文字）：

{
    "type": "note" | "idea",
    "confidence": 0.0-1.0,
    "data": {
        "title": "简洁的标题（必须）",
        "content": "详细描述（可选）",
        "category": "工作|学习|生活|健康|其他",
        "priority": "low|medium|high",
        "isImportant": true|false,
        "dueDate": "YYYY-MM-DDTHH:mm:ss" 或 null,
        "reminderDate": "YYYY-MM-DDTHH:mm:ss" 或 null,
        "tags": ["标签1", "标签2"]
    }
}

解析规则：
- 如果包含"想法"、"灵感"、"思考"等词，type为"idea"
- 如果包含"任务"、"待办"、"要做"或有明确时间点，type为"note"
- 时间词解析：今天=${new Date().toISOString().split('T')[0]}
- "明天"、"后天"、"下周一"等需要正确计算日期
- "下午3点"→15:00，"晚上8点"→20:00
- 如果只说了截止时间，可以建议一个提醒时间（提前30分钟到1天）
- 优先级：包含"紧急"、"马上"→high；"有空"、"以后"→low；默认→medium
- isImportant：包含"重要"、"关键"、"必须"→true

只返回JSON，不要有任何其他说明文字。`,

    weeklyReport: `你是一个效率分析师。请根据用户本周的数据生成一份简洁的周报。

包含以下内容：
1. 本周概况（完成率、亮点）
2. 效率分析（哪些做得好，哪些需要改进）
3. 下周建议（2-3条具体建议）

请用积极、鼓励的语气，同时给出实际可行的建议。`
};

/**
 * 构建对话上下文
 */
function buildContext(userData) {
    let context = '';

    if (userData.notes && userData.notes.length > 0) {
        const pending = userData.notes.filter(n => !n.completed);
        const completed = userData.notes.filter(n => n.completed);

        context += `\n## 用户的待办事项\n`;
        context += `### 进行中 (${pending.length}条)\n`;
        pending.slice(0, 10).forEach(n => {
            context += `- [${n.priority === 'high' ? '🔴' : n.priority === 'medium' ? '🟡' : '🟢'}] ${n.title}`;
            if (n.dueDate) context += ` (截止: ${new Date(n.dueDate).toLocaleDateString('zh-CN')})`;
            context += '\n';
        });

        if (completed.length > 0) {
            context += `### 已完成 (${completed.length}条，最近5条)\n`;
            completed.slice(0, 5).forEach(n => {
                context += `- ✅ ${n.title}\n`;
            });
        }
    }

    if (userData.ideas && userData.ideas.length > 0) {
        context += `\n## 用户的想法记录 (${userData.ideas.length}条)\n`;
        userData.ideas.slice(0, 10).forEach(i => {
            context += `- 💡 ${i.title}`;
            if (i.category) context += ` [${i.category}]`;
            context += '\n';
        });
    }

    if (userData.stats) {
        context += `\n## 统计数据\n`;
        context += `- 本周新建: ${userData.stats.weekCreated || 0}\n`;
        context += `- 本周完成: ${userData.stats.weekCompleted || 0}\n`;
        context += `- 完成率: ${userData.stats.weekRate || 0}%\n`;
    }

    return context;
}

module.exports = {
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
};
