const express = require('express');
const cron = require('node-cron');
const { getUpcomingReminders, markReminderSent, getUserById } = require('../utils/db');
const { sendTelegramMessage, formatNoteForTelegram } = require('../utils/telegram');
const { sendEmailNotification } = require('../utils/email');

const router = express.Router();

// Check for reminders every minute
const startReminderScheduler = () => {
    cron.schedule('* * * * *', async () => {
        try {
            const reminders = getUpcomingReminders();

            for (const note of reminders) {
                const user = getUserById(note.userId);
                if (!user) continue;

                let sent = false;

                // Send reminders based on user's preferred methods
                if (note.reminderMethods && note.reminderMethods.length > 0) {
                    for (const method of note.reminderMethods) {
                        if (method === 'telegram' && user.telegramChatId) {
                            const message = formatNoteForTelegram(note, user);
                            const success = await sendTelegramMessage(user.telegramChatId, message);
                            if (success) {
                                console.log(`Telegram reminder sent for note ${note.id}`);
                                sent = true;
                            }
                        }

                        if (method === 'email' && user.email) {
                            const success = await sendEmailNotification(
                                user.email,
                                `📝 待办提醒: ${note.title}`,
                                note
                            );
                            if (success) {
                                console.log(`Email reminder sent for note ${note.id}`);
                                sent = true;
                            }
                        }
                    }
                } else {
                    // Default: send email if configured
                    if (user.email) {
                        const success = await sendEmailNotification(
                            user.email,
                            `📝 待办提醒: ${note.title}`,
                            note
                        );
                        if (success) {
                            console.log(`Email reminder sent for note ${note.id}`);
                            sent = true;
                        }
                    }
                }

                // Mark as sent
                if (sent) {
                    markReminderSent(note.id);
                }
            }
        } catch (error) {
            console.error('Error in reminder scheduler:', error);
        }
    });

    console.log('Reminder scheduler started (runs every minute)');
};

module.exports = { router, startReminderScheduler };
