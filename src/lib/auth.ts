import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'vibe-command-center-super-secret-key-2026'
);

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'vibe2026';

export async function createToken(payload: { username: string; role?: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as { username: string; role?: string };
  } catch (err) {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = cookies();
  const token = cookieStore.get('vibe_session')?.value;
  if (!token) return null;
  const decoded = await verifyToken(token);
  if (!decoded || !decoded.username) return null;

  const db = getDb();
  const dbUser = db.users?.find((u) => u.username === decoded.username);
  
  const isEnvAdmin = decoded.username === ADMIN_USERNAME;
  const role = dbUser?.role || (isEnvAdmin ? 'admin' : 'member');
  const creditsBalance = dbUser?.creditsBalance ?? (role === 'admin' ? 99999 : 100.0);

  return {
    username: decoded.username,
    role: role as 'admin' | 'member',
    creditsBalance,
    user: dbUser,
  };
}

export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}
