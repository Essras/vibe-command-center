import { NextResponse } from 'next/server';
import { createToken, ADMIN_USERNAME, ADMIN_PASSWORD } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    const db = getDb();

    // Check against DB users list
    const foundUser = db.users.find(
      (u) => u.username === username && u.password === password
    );

    // Fallback check against env variables
    const isEnvAdmin = username === ADMIN_USERNAME && password === ADMIN_PASSWORD;

    if (foundUser || isEnvAdmin) {
      const token = await createToken({ username });
      const res = NextResponse.json({ success: true, username });
      res.cookies.set('vibe_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return res;
    }
    return NextResponse.json(
      { success: false, error: 'Username หรือ Password ไม่ถูกต้อง' },
      { status: 401 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set('vibe_session', '', { maxAge: 0, path: '/' });
  return res;
}
