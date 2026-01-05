const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUserByEmail, updateUserPassword, updateUserSettings } = require('../utils/db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ==================== 登录失败记录（防暴力破解） ====================
const loginAttempts = new Map(); // email -> { count, lastAttempt }
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 5 * 60 * 1000; // 5分钟

/**
 * 检查是否被锁定
 */
function isLocked(email) {
    const attempt = loginAttempts.get(email);
    if (!attempt) return false;

    if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
        const timeSinceLastAttempt = Date.now() - attempt.lastAttempt;
        if (timeSinceLastAttempt < LOCKOUT_TIME) {
            return true;
        } else {
            // 锁定时间已过，重置
            loginAttempts.delete(email);
            return false;
        }
    }
    return false;
}

/**
 * 记录登录失败
 */
function recordFailedAttempt(email) {
    const attempt = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
    attempt.count++;
    attempt.lastAttempt = Date.now();
    loginAttempts.set(email, attempt);
}

/**
 * 清除登录失败记录
 */
function clearFailedAttempts(email) {
    loginAttempts.delete(email);
}

// ==================== 登录接口 ====================
/**
 * POST /api/auth/login
 * 用户登录（单用户模式）
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 验证输入
        if (!email || !password) {
            return res.status(400).json({ error: '邮箱和密码不能为空' });
        }

        // 检查是否被锁定
        if (isLocked(email)) {
            return res.status(429).json({
                error: '登录失败次数过多，请5分钟后重试',
                lockoutTime: LOCKOUT_TIME
            });
        }

        // 查找用户
        const user = getUserByEmail(email);
        if (!user) {
            recordFailedAttempt(email);
            return res.status(401).json({ error: '邮箱或密码错误' });
        }

        // 验证密码
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            recordFailedAttempt(email);
            return res.status(401).json({ error: '邮箱或密码错误' });
        }

        // 登录成功，清除失败记录
        clearFailedAttempts(email);

        // 生成 JWT token（7天有效期）
        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: '登录成功',
            token,
            user: {
                id: user.id,
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
        const user = getUserByEmail(req.user.email);
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
        const { telegramChatId } = req.body;

        const success = updateUserSettings(req.user.id, {
            telegramChatId: telegramChatId || null
        });

        if (!success) {
            return res.status(500).json({ error: '设置更新失败' });
        }

        res.json({ message: '设置已更新' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: '设置更新失败' });
    }
});

module.exports = router;
