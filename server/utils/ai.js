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

    // 动态生成解析提示词的函数（每次调用时重新计算日期）
    getParsePrompt: function() {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const dayOfWeek = now.getDay(); // 0=周日, 1=周一, ... 6=周六
        const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

        // 计算相对于今天的日期
        const getDateStr = (daysFromToday) => {
            const d = new Date(now);
            d.setDate(d.getDate() + daysFromToday);
            return d.toISOString().split('T')[0];
        };

        // 计算本周X是哪天
        const getThisWeekDay = (targetDay) => {
            // targetDay: 0=周日, 1=周一, ..., 6=周六
            const diff = targetDay - dayOfWeek;
            return getDateStr(diff);
        };

        // 计算下周X是哪天
        const getNextWeekDay = (targetDay) => {
            // targetDay: 0=周日, 1=周一, ..., 6=周六
            // 下周一 = 今天 + (7 - dayOfWeek + 1) 或直接 + (8 - dayOfWeek) % 7 + 7 when needed
            const daysUntilNextMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
            const daysFromNextMonday = targetDay === 0 ? 6 : (targetDay - 1);
            return getDateStr(daysUntilNextMonday + daysFromNextMonday);
        };

        return `你是一个智能输入解析器。用户会用自然语言描述一个任务或想法，你需要解析并提取结构化信息。

【当前时间信息 - 非常重要，请严格使用以下日期】
- 今天: ${today} (星期${dayNames[dayOfWeek]})
- 明天: ${getDateStr(1)}
- 后天: ${getDateStr(2)}
- 本周五/这周五: ${getThisWeekDay(5)}
- 本周六: ${getThisWeekDay(6)}
- 本周日: ${getThisWeekDay(0)}
- 下周一: ${getNextWeekDay(1)}
- 下周二: ${getNextWeekDay(2)}
- 下周三: ${getNextWeekDay(3)}
- 下周四: ${getNextWeekDay(4)}
- 下周五: ${getNextWeekDay(5)}
- 下周六: ${getNextWeekDay(6)}
- 下周日: ${getNextWeekDay(0)}

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

【日期解析规则 - 必须严格遵守】
用户说"下周五"时，必须使用上面【当前时间信息】中"下周五"对应的日期：${getNextWeekDay(5)}
用户说"本周五"或"这周五"时，使用：${getThisWeekDay(5)}

时间解析：
- "早上/上午X点" → X:00 (X<=12)
- "下午X点" → (X+12):00 (X<12时)
- "晚上X点" → (X+12):00
- 无具体时间时，截止日期默认 18:00

其他解析规则：
- 包含"想法"、"灵感"、"思考"等词 → type="idea"
- 包含时间点或"任务"、"待办"、"要做" → type="note"
- "紧急"、"马上"、"立刻" → priority="high"
- "有空"、"以后"、"不急" → priority="low"
- "重要"、"关键"、"必须" → isImportant=true
- 如有截止时间，建议提醒时间提前1天上午9点

只返回JSON，不要有任何其他说明文字。`;
    },

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
