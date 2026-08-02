import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sendTelegramAlert } from '@/lib/telegram';

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const testMessage = `🤖 <b>Vibe Command Center - Telegram Test Alert</b>\n\nยินดีด้วยครับ! การเชื่อมต่อ Telegram Bot กับเซิร์ฟเวอร์ VPS ของคุณทำงานได้สมบูรณ์ 100% แล้ว! 🎉\n\n⏰ เวลาส่งข้อความ: ${new Date().toLocaleString('th-TH')}`;
    const success = await sendTelegramAlert(testMessage, 'https://vibe.zodiacpsych.com');

    if (success) {
      return NextResponse.json({ success: true, message: 'ส่งข้อความทดสอบเข้า Telegram เรียบร้อยแล้ว!' });
    } else {
      return NextResponse.json(
        { error: 'ไม่สามารถส่งข้อความเข้า Telegram ได้ กรุณาตรวจสอบ Telegram Bot Token และ Chat ID' },
        { status: 400 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
