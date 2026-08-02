import { getDb } from '@/lib/db';

export async function sendTelegramAlert(message: string, buttonUrl?: string): Promise<boolean> {
  try {
    const db = getDb();
    const botToken = db.keys.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = db.keys.telegramChatId || process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return false;
    }

    const payload: any = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    };

    if (buttonUrl) {
      payload.reply_markup = {
        inline_keyboard: [
          [
            {
              text: '🔗 เปิดดูผลลัพธ์บน Vibe Command Center',
              url: buttonUrl,
            },
          ],
        ],
      };
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (err) {
    console.error('Telegram notification error:', err);
    return false;
  }
}
