import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'vibe-command-center-super-secret-key-2026'
);

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'vibe2026';

export async function createToken(payload: { username: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as { username: string };
  } catch (err) {
    return null;
  }
}

export async function isAuthenticated() {
  const cookieStore = cookies();
  const token = cookieStore.get('vibe_session')?.value;
  if (!token) return false;
  const user = await verifyToken(token);
  return !!user;
}
