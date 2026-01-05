const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const { initDataFiles, backupData } = require('./utils/db');
const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');
const ideasRoutes = require('./routes/ideas');
const aiRoutes = require('./routes/ai');
const { router: remindersRouter, startReminderScheduler } = require('./routes/reminders');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== 初始化数据文件 ====================
(async () => {
    await initDataFiles();
})();

// ==================== 中间件 ====================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ==================== 路由 ====================
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/ideas', ideasRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reminders', remindersRouter);

// ==================== 前端页面 ====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/app.html'));
});

// ==================== 启动提醒调度器 ====================
startReminderScheduler();

// ==================== 启动自动备份调度器 ====================
// 每天凌晨3点自动备份
cron.schedule('0 3 * * *', () => {
    try {
        const backupFile = backupData();
        console.log(`✅ Auto backup created: ${backupFile}`);
    } catch (error) {
        console.error('❌ Auto backup failed:', error);
    }
});
console.log('💾 Auto backup scheduler started (runs daily at 3 AM)');

// ==================== 启动服务器 ====================
app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`✨ 智能便签系统已启动`);
    console.log(`========================================`);
    console.log(`🌐 访问地址: http://localhost:${PORT}`);
    console.log(`📝 管理员邮箱: admin@todo.local`);
    console.log(`🔑 默认密码: admin123 (首次登录后请修改)`);
    console.log(`\n⚙️  功能状态:`);
    console.log(`   - JWT Secret: ${process.env.JWT_SECRET ? '✅ 已配置' : '⚠️  使用默认值'}`);
    console.log(`   - 邮件提醒: ${process.env.EMAIL_USER ? '✅ 已配置' : '❌ 未配置'}`);
    console.log(`   - Telegram: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ 已配置' : '❌ 未配置'}`);
    console.log(`   - 自动备份: ✅ 每天3:00自动备份`);
    console.log(`   - 提醒调度: ✅ 每分钟检查一次`);
    console.log(`========================================\n`);
});
