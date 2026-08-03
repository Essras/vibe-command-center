import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';
import { extractGDriveId, downloadGDriveFolderToWorkspace } from '@/lib/gdrive';
import { getSafePath, serveRawFile } from '@/lib/fileUtils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'list';
    const reqPath = searchParams.get('path') || '.';
    const download = searchParams.get('download') === 'true';

    const targetPath = getSafePath(reqPath);
    const appRoot = process.cwd();
    const vpsRoot = process.env.VPS_ROOT_PATH;

    if (action === 'raw' || action === 'download') {
      return serveRawFile(req, targetPath, download || action === 'download');
    }

    if (action === 'list') {
      if (!fsSync.existsSync(targetPath)) {
        await fs.mkdir(targetPath, { recursive: true });
      }
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      const items = entries.map((entry) => {
        const fullItemPath = path.join(targetPath, entry.name);
        let itemRelPath = path.relative(appRoot, fullItemPath).replace(/\\/g, '/');
        if (itemRelPath.startsWith('..') && vpsRoot) {
          itemRelPath = path.relative(vpsRoot, fullItemPath).replace(/\\/g, '/');
        }
        return {
          name: entry.name,
          isDirectory: entry.isDirectory(),
          path: itemRelPath,
        };
      });

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
    if (action === 'import_gdrive') {
      const { url } = body;
      const gdriveId = extractGDriveId(url);
      if (!gdriveId) {
        return NextResponse.json({ error: 'ไม่พบ ID หรือรูปแบบลิงก์ Google Drive ไม่ถูกต้อง' }, { status: 400 });
      }

      const currentUser = await getCurrentUser();
      const res = await downloadGDriveFolderToWorkspace(
        gdriveId,
        reqPath || 'workspace/video-editor/input',
        currentUser?.user?.googleAccessToken
      );

      if (res.success) {
        return NextResponse.json({
          success: true,
          message: `ดึงไฟล์จาก Google Drive เข้าสู่ ${reqPath} สำเร็จ (${res.downloadedCount} ไฟล์)`,
          files: res.files,
        });
      } else {
        return NextResponse.json({ error: res.error || 'เกิดข้อผิดพลาดในการดึงไฟล์จาก Google Drive' }, { status: 400 });
      }
    }

    if (action === 'upload') {
      const { filename, base64 } = body;
      if (!filename || !base64) {
        return NextResponse.json({ error: 'Missing filename or base64 data' }, { status: 400 });
      }
      const fileBuffer = Buffer.from(base64.replace(/^data:.*?;base64,/, ''), 'base64');
      const targetFilePath = getSafePath(path.join(reqPath || '.', filename));
      const dir = path.dirname(targetFilePath);
      if (!fsSync.existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }
      await fs.writeFile(targetFilePath, fileBuffer);
      return NextResponse.json({ success: true, message: 'File uploaded successfully' });
    }

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

    if (action === 'rename') {
      const { oldPath, newName } = body;
      if (!oldPath || !newName) {
        return NextResponse.json({ error: 'Missing oldPath or newName' }, { status: 400 });
      }
      const oldFullPath = getSafePath(oldPath);
      const newFullPath = path.join(path.dirname(oldFullPath), newName.trim().replace(/[^a-zA-Z0-9._-]/g, '_'));
      await fs.rename(oldFullPath, newFullPath);
      return NextResponse.json({ success: true, message: 'Renamed successfully' });
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
