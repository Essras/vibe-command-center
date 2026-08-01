import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAppOrigin } from '@/lib/auth';

export async function GET(req: Request) {
  const db = getDb();
  const clientId = process.env.GOOGLE_CLIENT_ID || db.keys?.googleClientId || '';
  const origin = getAppOrigin(req);

  if (!clientId) {
    return NextResponse.redirect(
      `${origin}/login?error=` + encodeURIComponent('ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID ในระบบ (กรุณาตั้งค่า GOOGLE_CLIENT_ID ในหน้า Settings หรือไฟล์ .env)')
    );
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

  const scopes = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/drive.file',
  ].join(' ');

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&access_type=offline` +
    `&prompt=select_account`;

  return NextResponse.redirect(googleAuthUrl);
}
