import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

function getSafePath(relativePath: string) {
  const base = process.env.VPS_ROOT_PATH || process.cwd();
  const resolved = path.resolve(base, relativePath.replace(/^(\.\/|\/)/, ''));
  return resolved;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'list';
    const reqPath = searchParams.get('path') || '.';

    const targetPath = getSafePath(reqPath);

    if (action === 'list') {
      if (!fsSync.existsSync(targetPath)) {
        await fs.mkdir(targetPath, { recursive: true });
      }
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      const items = entries.map((entry) => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        path: path.relative(process.env.VPS_ROOT_PATH || process.cwd(), path.join(targetPath, entry.name)),
      }));

      // Sort directories first, then files
      items.sort((a, b) => (a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1));

      return NextResponse.json({ items, currentPath: reqPath });
    }

    if (action === 'read') {
      if (!fsSync.existsSync(targetPath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      const content = await fs.readFile(targetPath, 'utf-8');
      return NextResponse.json({ content, path: reqPath });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, path: reqPath, content, isDirectory } = body;
    const targetPath = getSafePath(reqPath || '.');

    if (action === 'save') {
      const dir = path.dirname(targetPath);
      if (!fsSync.existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }
      await fs.writeFile(targetPath, content || '', 'utf-8');
      return NextResponse.json({ success: true, message: 'File saved successfully' });
    }

    if (action === 'create') {
      if (isDirectory) {
        await fs.mkdir(targetPath, { recursive: true });
      } else {
        const dir = path.dirname(targetPath);
        if (!fsSync.existsSync(dir)) {
          await fs.mkdir(dir, { recursive: true });
        }
        await fs.writeFile(targetPath, '', 'utf-8');
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      if (fsSync.existsSync(targetPath)) {
        const stat = await fs.stat(targetPath);
        if (stat.isDirectory()) {
          await fs.rm(targetPath, { recursive: true, force: true });
        } else {
          await fs.unlink(targetPath);
        }
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
