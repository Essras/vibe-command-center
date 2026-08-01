import { NextResponse } from 'next/server';
import { getDb, saveDb, UserMember } from '@/lib/db';

export async function GET() {
  const db = getDb();
  return NextResponse.json({ users: db.users });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, user } = body;
    const db = getDb();

    if (action === 'create') {
      if (!user.username || !user.password) {
        return NextResponse.json({ error: 'กรุณากรอก Username และ Password' }, { status: 400 });
      }
      if (db.users.some((u) => u.username === user.username)) {
        return NextResponse.json({ error: 'Username นี้ถูกใช้งานแล้ว' }, { status: 400 });
      }

      const newUser: UserMember = {
        id: 'usr-' + Date.now(),
        username: user.username.trim(),
        password: user.password,
        role: user.role || 'member',
        status: user.status || 'approved',
        creditsBalance: typeof user.creditsBalance === 'number' ? user.creditsBalance : 100.0,
        createdAt: new Date().toISOString(),
      };
      db.users.push(newUser);
      saveDb(db);
      return NextResponse.json({ success: true, user: newUser });
    }

    if (action === 'approve') {
      const idx = db.users.findIndex((u) => u.id === user.id);
      if (idx !== -1) {
        db.users[idx].status = 'approved';
        saveDb(db);
        return NextResponse.json({ success: true, user: db.users[idx] });
      }
      return NextResponse.json({ error: 'ไม่พบผู้ใช้ที่ต้องการอนุมัติ' }, { status: 404 });
    }

    if (action === 'reject') {
      const idx = db.users.findIndex((u) => u.id === user.id);
      if (idx !== -1) {
        db.users[idx].status = 'rejected';
        saveDb(db);
        return NextResponse.json({ success: true, user: db.users[idx] });
      }
      return NextResponse.json({ error: 'ไม่พบผู้ใช้ที่ต้องการปฏิเสธ' }, { status: 404 });
    }

    if (action === 'update') {
      const idx = db.users.findIndex((u) => u.id === user.id);
      if (idx !== -1) {
        if (user.password) db.users[idx].password = user.password;
        if (user.role) db.users[idx].role = user.role;
        if (user.status) db.users[idx].status = user.status;
        saveDb(db);
        return NextResponse.json({ success: true, user: db.users[idx] });
      }
      return NextResponse.json({ error: 'ไม่พบผู้ใช้ที่ต้องการแก้ไข' }, { status: 404 });
    }

    if (action === 'delete') {
      if (db.users.length <= 1) {
        return NextResponse.json({ error: 'ไม่สามารถลบผู้ใช้คนสุดท้ายของระบบได้' }, { status: 400 });
      }
      db.users = db.users.filter((u) => u.id !== user.id);
      saveDb(db);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
