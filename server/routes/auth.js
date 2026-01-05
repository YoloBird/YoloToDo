const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUserByEmail, getUserByUsername, getUserById, updateUserPassword, updateUserSettings } = require('../utils/db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const { sendTelegramMessage } = require('../utils/telegram');
const { sendEmailNotification } = require('../utils/email');

const router = express.Router();

// ==================== 登录失败记录（防暴力破解） ====================
const loginAttempts = new Map(); // username -> { count, lastAttempt }
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 5 * 60 * 1000; // 5分钟

/**
 * 检查是否被锁定
 */
function isLocked(username) {
    const attempt = loginAttempts.get(username);
    if (!attempt) return false;

    if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
        const timeSinceLastAttempt = Date.now() - attempt.lastAttempt;
        if (timeSinceLastAttempt < LOCKOUT_TIME) {
            return true;
        } else {
            // 锁定时间已过，重置
            loginAttempts.delete(username);
            return false;
        }
    }
    return false;
}

/**
 * 记录登录失败
 */
function recordFailedAttempt(username) {
    const attempt = loginAttempts.get(username) || { count: 0, lastAttempt: 0 };
    attempt.count++;
    attempt.lastAttempt = Date.now();
    loginAttempts.set(username, attempt);
}

/**
 * 清除登录失败记录
 */
function clearFailedAttempts(username) {
    loginAttempts.delete(username);
}

// ==================== 登录接口 ====================
/**
 * POST /api/auth/login
 * 用户登录（单用户模式）
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 验证输入
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }

        const identifier = username.trim();

        // 检查是否被锁定
        if (isLocked(identifier)) {
            return res.status(429).json({
                error: '登录失败次数过多，请5分钟后重试',
                lockoutTime: LOCKOUT_TIME
            });
        }

        // 查找用户
        let user = getUserByUsername(identifier);
        if (!user) {
            const emailUser = getUserByEmail(identifier);
            if (emailUser && !emailUser.username) {
                user = emailUser;
            }
        }
        if (!user) {
            const idUser = getUserById(identifier);
            if (idUser && !idUser.username) {
                user = idUser;
            }
        }
        if (!user) {
            recordFailedAttempt(identifier);
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        // 验证密码
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            recordFailedAttempt(identifier);
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        // 登录成功，清除失败记录
        clearFailedAttempts(identifier);

        // 生成 JWT token（7天有效期）
        const token = jwt.sign(
            { id: user.id, username: user.username || user.id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: '登录成功',
            token,
            user: {
                id: user.id,
                username: user.username || user.id,
                email: user.email,
                telegramChatId: user.telegramChatId
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: '登录失败' });
    }
});

// ==================== 修改密码接口 ====================
/**
 * POST /api/auth/change-password
 * 修改密码（需要登录）
 */
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        // 验证输入
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: '旧密码和新密码不能为空' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: '新密码至少需要6位' });
        }

        // 获取当前用户
        const user = getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        // 验证旧密码
        const validPassword = await bcrypt.compare(oldPassword, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: '旧密码错误' });
        }

        // 加密新密码
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 更新密码
        const success = updateUserPassword(user.id, hashedPassword);
        if (!success) {
            return res.status(500).json({ error: '密码更新失败' });
        }

        res.json({ message: '密码修改成功，请使用新密码重新登录' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: '密码修改失败' });
    }
});

// ==================== 更新用户设置 ====================
/**
 * PUT /api/auth/settings
 * 更新用户设置（如 Telegram Chat ID）
 */
router.put('/settings', authenticateToken, async (req, res) => {
    try {
        const { telegramChatId, notificationEmail } = req.body;
        const updates = {
            telegramChatId: telegramChatId || null
        };

        if (notificationEmail !== undefined) {
            const trimmedEmail = (notificationEmail || '').trim();
            if (!trimmedEmail) {
                updates.email = null;
            } else {
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailPattern.test(trimmedEmail)) {
                    return res.status(400).json({ error: '邮箱格式不正确' });
                }
                updates.email = trimmedEmail;
            }
        }

        const success = updateUserSettings(req.user.id, updates);

        if (!success) {
            return res.status(500).json({ error: '设置更新失败' });
        }

        res.json({ message: '设置已更新' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: '设置更新失败' });
    }
});

// ==================== 账户设置 ====================
/**
 * PUT /api/auth/account
 * 更新账号用户名
 */
router.put('/account', authenticateToken, async (req, res) => {
    try {
        const { username } = req.body;

        if (!username || !username.trim()) {
            return res.status(400).json({ error: '用户名不能为空' });
        }

        const trimmedUsername = username.trim();
        if (trimmedUsername.length > 32) {
            return res.status(400).json({ error: '用户名过长' });
        }

        const existing = getUserByUsername(trimmedUsername);
        if (existing && existing.id !== req.user.id) {
            return res.status(409).json({ error: '该用户名已被使用' });
        }

        const success = updateUserSettings(req.user.id, { username: trimmedUsername });
        if (!success) {
            return res.status(500).json({ error: '账号更新失败' });
        }

        const user = getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username || user.id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: '账号已更新',
            token,
            user: {
                id: user.id,
                username: user.username || user.id,
                email: user.email,
                telegramChatId: user.telegramChatId
            }
        });
    } catch (error) {
        console.error('Update account error:', error);
        res.status(500).json({ error: '账号更新失败' });
    }
});

// ==================== 测试 Telegram ====================
/**
 * POST /api/auth/settings/test-telegram
 * 发送测试 Telegram 消息
 */
router.post('/settings/test-telegram', authenticateToken, async (req, res) => {
    try {
        if (!process.env.TELEGRAM_BOT_TOKEN) {
            return res.status(400).json({ error: 'Telegram Bot 未配置' });
        }

        const { telegramChatId } = req.body;
        const user = getUserById(req.user.id);
        const chatId = telegramChatId || (user && user.telegramChatId);

        if (!chatId) {
            return res.status(400).json({ error: '请先设置 Telegram Chat ID' });
        }

        const timestamp = new Date().toLocaleString('zh-CN');
        const label = (user && (user.username || user.email)) || req.user.username || '';
        const message = `🧪 Telegram 测试消息\n账号: ${label}\n时间: ${timestamp}`;

        const success = await sendTelegramMessage(chatId, message);
        if (!success) {
            return res.status(500).json({ error: '发送失败，请检查 Bot Token 或 Chat ID' });
        }

        res.json({ message: '测试消息已发送' });
    } catch (error) {
        console.error('Test Telegram error:', error);
        res.status(500).json({ error: '发送失败' });
    }
});

// ==================== 测试邮件 ====================
/**
 * POST /api/auth/settings/test-email
 * 发送测试邮件
 */
router.post('/settings/test-email', authenticateToken, async (req, res) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            return res.status(400).json({ error: '邮件服务未配置' });
        }

        const { notificationEmail } = req.body;
        const user = getUserById(req.user.id);
        const to = (notificationEmail || (user && user.email) || '').trim();

        if (!to) {
            return res.status(400).json({ error: '请先设置通知邮箱' });
        }

        const note = {
            title: '邮件提醒测试',
            content: '这是一封测试邮件，用于确认提醒功能正常。',
            category: '系统',
            priority: 'low',
            dueDate: new Date().toISOString(),
            tags: ['测试']
        };

        const success = await sendEmailNotification(to, '🧪 邮件提醒测试', note);
        if (!success) {
            return res.status(500).json({ error: '发送失败，请检查邮件配置' });
        }

        res.json({ message: '测试邮件已发送' });
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({ error: '发送失败' });
    }
});

module.exports = router;
