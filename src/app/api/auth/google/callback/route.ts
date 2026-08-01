import { NextResponse } from 'next/server';
import { getDb, saveDb, UserMember } from '@/lib/db';
import { createToken, ADMIN_USERNAME, getAppOrigin, getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const origin = getAppOrigin(req);
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${origin}/login?error=GoogleAuthFailed`);
  }

  const db = getDb();
  const clientId = process.env.GOOGLE_CLIENT_ID || db.keys?.googleClientId || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || db.keys?.googleClientSecret || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

  try {
    // 1. Exchange authorization code for Google Access Tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('Google Token Exchange Error:', errBody);
      return NextResponse.redirect(`${origin}/login?error=TokenExchangeFailed`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch Google User Profile (email & name)
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(`${origin}/login?error=FetchProfileFailed`);
    }

    const googleUser = await userRes.json();
    const email = googleUser.email;
    const username = email ? email.split('@')[0] : 'google_user_' + Date.now();

    // Check if user is ALREADY logged in (Binding Google Drive account to current active session)
    const activeSession = await getCurrentUser();
    if (activeSession && activeSession.username) {
      const loggedUserIdx = db.users.findIndex((u) => u.username === activeSession.username);
      if (loggedUserIdx !== -1) {
        db.users[loggedUserIdx].googleConnected = true;
        db.users[loggedUserIdx].googleEmail = email;
        db.users[loggedUserIdx].googleAccessToken = accessToken;
        db.users[loggedUserIdx].googleConnectedAt = new Date().toISOString();
        saveDb(db);
        return NextResponse.redirect(`${origin}/?status=GoogleDriveConnected`);
      }
    }

    // 3. Otherwise, Find or create member in local database
    let existingUserIndex = db.users.findIndex(
      (u) => u.username === username || u.username === email
    );

    const isEnvAdmin = username === ADMIN_USERNAME || email === ADMIN_USERNAME;
    const userRole = isEnvAdmin ? 'admin' : 'member';

    let user: UserMember;

    if (existingUserIndex === -1) {
      // New users via Google default to 'pending' unless they are admin
      const initialStatus = isEnvAdmin ? 'approved' : 'pending';
      const newUser: UserMember = {
        id: 'usr-' + Date.now(),
        username: username,
        password: 'google_oauth_user',
        role: userRole,
        status: initialStatus,
        creditsBalance: userRole === 'admin' ? 99999 : 100.0,
        createdAt: new Date().toISOString(),
        googleConnected: true,
        googleEmail: email,
        googleAccessToken: accessToken,
        googleConnectedAt: new Date().toISOString(),
      };
      db.users.push(newUser);
      saveDb(db);
      user = newUser;
    } else {
      user = db.users[existingUserIndex];
      user.googleConnected = true;
      user.googleEmail = email;
      user.googleAccessToken = accessToken;
      saveDb(db);
    }

    // 4. Check approval status
    if (user.status === 'pending') {
      const pendingMsg = encodeURIComponent('บัญชี Google ของคุณสมัครเรียบร้อยแล้ว แต่อยู่ระหว่างรอ Admin อนุมัติการเข้าใช้งาน');
      return NextResponse.redirect(`${origin}/login?error=${pendingMsg}`);
    }

    if (user.status === 'rejected') {
      const rejectedMsg = encodeURIComponent('บัญชีของคุณถูกปฏิเสธการเข้าใช้งานโดย Admin');
      return NextResponse.redirect(`${origin}/login?error=${rejectedMsg}`);
    }

    // 5. Create JWT session token for approved users
    const token = await createToken({ username, role: userRole });
    const response = NextResponse.redirect(`${origin}/`);

    response.cookies.set('vibe_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    console.error('Google Callback Error:', err);
    return NextResponse.redirect(`${origin}/login?error=` + encodeURIComponent(err.message));
  }
}
