const nodemailer = require('nodemailer');
require('dotenv').config();

// Create email transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Send email notification
const sendEmailNotification = async (to, subject, note) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Email configuration not set');
        return false;
    }

    try {
        const transporter = createTransporter();

        const priorityBadge = {
            'high': '<span style="background: #ef4444; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">高优先级</span>',
            'medium': '<span style="background: #f59e0b; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">中优先级</span>',
            'low': '<span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">低优先级</span>'
        };

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
        }
        .content {
            background: #f8fafc;
            padding: 25px;
            border-radius: 12px;
            border-left: 4px solid #6366f1;
        }
        .note-title {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 15px;
        }
        .note-content {
            color: #64748b;
            margin-bottom: 20px;
            white-space: pre-wrap;
        }
        .meta-info {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
        }
        .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #64748b;
            font-size: 14px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #94a3b8;
            font-size: 14px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔔 待办提醒</h1>
    </div>

    <div class="content">
        <div class="note-title">${note.title}</div>
        ${note.content ? `<div class="note-content">${note.content}</div>` : ''}

        <div class="meta-info">
            ${note.category ? `<div class="meta-item">📂 分类: ${note.category}</div>` : ''}
            ${note.priority ? `<div class="meta-item">${priorityBadge[note.priority] || ''}</div>` : ''}
            ${note.dueDate ? `<div class="meta-item">⏰ 截止: ${new Date(note.dueDate).toLocaleString('zh-CN')}</div>` : ''}
            ${note.tags && note.tags.length > 0 ? `<div class="meta-item">🏷️ ${note.tags.join(', ')}</div>` : ''}
        </div>

        ${process.env.APP_URL ? `<a href="${process.env.APP_URL}" class="button">查看详情</a>` : ''}
    </div>

    <div class="footer">
        <p>这是一封自动发送的提醒邮件，请勿回复。</p>
    </div>
</body>
</html>
        `;

        const info = await transporter.sendMail({
            from: `"待办提醒" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: htmlContent
        });

        console.log('Email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

module.exports = {
    sendEmailNotification
};
