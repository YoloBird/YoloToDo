const fetch = require('node-fetch');
require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Send message to Telegram
const sendTelegramMessage = async (chatId, message) => {
    if (!TELEGRAM_BOT_TOKEN) {
        console.warn('Telegram bot token not configured');
        return false;
    }

    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });

        const data = await response.json();
        return data.ok;
    } catch (error) {
        console.error('Error sending Telegram message:', error);
        return false;
    }
};

// Format note for Telegram notification
const formatNoteForTelegram = (note, user) => {
    let message = `🔔 <b>提醒通知</b>\n\n`;
    message += `📝 <b>${note.title}</b>\n\n`;

    if (note.content) {
        const contentPreview = note.content.length > 200
            ? note.content.substring(0, 200) + '...'
            : note.content;
        message += `${contentPreview}\n\n`;
    }

    if (note.category) {
        message += `📂 分类: ${note.category}\n`;
    }

    if (note.priority) {
        const priorityEmoji = {
            'high': '🔴',
            'medium': '🟡',
            'low': '🟢'
        };
        message += `${priorityEmoji[note.priority] || '⚪'} 优先级: ${note.priority}\n`;
    }

    if (note.dueDate) {
        message += `⏰ 截止日期: ${new Date(note.dueDate).toLocaleString('zh-CN')}\n`;
    }

    message += `\n👤 用户: ${user.email}`;

    return message;
};

module.exports = {
    sendTelegramMessage,
    formatNoteForTelegram
};
