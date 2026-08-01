import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const clientId = process.env.GOOGLE_CLIENT_ID || db.keys?.googleClientId || '';

  if (!clientId) {
    return NextResponse.json(
      { error: 'ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID ในระบบ' },
      { status: 400 }
    );
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://vibe.zodiacpsych.com/api/auth/google/callback';

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
    `&prompt=consent`;

  return NextResponse.redirect(googleAuthUrl);
}
