import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

export interface GDriveDownloadResult {
  success: boolean;
  fileId: string;
  filePath?: string;
  fileName?: string;
  error?: string;
}

export function extractGDriveId(urlOrText: string): string | null {
  if (!urlOrText) return null;
  const match = urlOrText.match(
    /(?:drive|docs)\.google\.com\/(?:file\/d\/|document\/d\/|spreadsheets\/d\/|open\?id=|drive\/folders\/)([a-zA-Z0-9_-]+)/
  );
  if (match && match[1]) {
    return match[1];
  }
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(urlOrText.trim())) {
    return urlOrText.trim();
  }
  return null;
}

export async function downloadGDriveFileToWorkspace(
  fileId: string,
  targetFolder: string = 'workspace/video-editor/input',
  googleAccessToken?: string
): Promise<GDriveDownloadResult> {
  try {
    const appRoot = process.cwd();
    const vpsRoot = process.env.VPS_ROOT_PATH;
    const cleanTargetFolder = targetFolder.trim().replace(/^(\.\/|\/)/, '');

    let destDir = path.resolve(appRoot, cleanTargetFolder);
    if (!fsSync.existsSync(destDir) && vpsRoot && fsSync.existsSync(vpsRoot)) {
      const vpsTarget = path.resolve(vpsRoot, 'root/vibe-command-center', cleanTargetFolder);
      if (fsSync.existsSync(vpsTarget)) {
        destDir = vpsTarget;
      }
    }

    if (!fsSync.existsSync(destDir)) {
      await fs.mkdir(destDir, { recursive: true });
    }

    let fileName = `gdrive_${fileId.slice(0, 8)}.mp4`;
    let fileBuffer: Buffer | null = null;

    // 1. Try Google Drive API with OAuth Access Token if available
    if (googleAccessToken) {
      try {
        const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType`, {
          headers: { Authorization: `Bearer ${googleAccessToken}` },
        });
        if (metaRes.ok) {
          const meta = await metaRes.json();
          if (meta.name) {
            fileName = meta.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          }
        }

        const mediaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${googleAccessToken}` },
        });
        if (mediaRes.ok) {
          const arrayBuf = await mediaRes.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuf);
        }
      } catch (e) {
        console.warn('Google Drive OAuth download failed, trying public download fallback...', e);
      }
    }

    // 2. Direct Google Drive CDN Public Download Fallback
    if (!fileBuffer) {
      const publicUrls = [
        `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
        `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`,
        `https://drive.google.com/uc?export=download&id=${fileId}`,
      ];

      for (const url of publicUrls) {
        try {
          const pubRes = await fetch(url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          });

          if (pubRes.ok) {
            const contentType = pubRes.headers.get('content-type') || '';
            const arrayBuf = await pubRes.arrayBuffer();
            const buf = Buffer.from(arrayBuf);
            const head = buf.toString('utf-8', 0, 100).toLowerCase();

            if (!contentType.includes('text/html') && !head.includes('<!doctype') && !head.includes('<html')) {
              fileBuffer = buf;
              break;
            }
          }
        } catch (e) {
          console.warn(`Public GDrive fetch failed for ${url}:`, e);
        }
      }
    }

    if (fileBuffer && fileBuffer.length > 0) {
      const targetPath = path.join(destDir, fileName);
      await fs.writeFile(targetPath, fileBuffer);
      return {
        success: true,
        fileId,
        filePath: `${targetFolder}/${fileName}`,
        fileName,
      };
    }

    return {
      success: false,
      fileId,
      error: 'ไฟล์ Google Drive นี้ตั้งสิทธิ์เป็นส่วนตัว (Private) หรือต้องการยืนยันตัวตนด้วย Google OAuth กรุณาผูกบัญชี Google Drive ในหน้า Member Portal หรือเปลี่ยนสิทธิ์แชร์ไฟล์เป็น "Anyone with the link can view"',
    };
  } catch (err: any) {
    return {
      success: false,
      fileId,
      error: err.message,
    };
  }
}

export async function downloadGDriveFolderToWorkspace(
  fileOrFolderId: string,
  targetFolder: string = 'workspace/video-editor/input',
  googleAccessToken?: string
): Promise<{ success: boolean; downloadedCount: number; files: string[]; error?: string }> {
  try {
    // 1. Try single file download first (handles both OAuth and Public CDN Direct URLs)
    const singleRes = await downloadGDriveFileToWorkspace(fileOrFolderId, targetFolder, googleAccessToken);
    if (singleRes.success && singleRes.fileName) {
      return {
        success: true,
        downloadedCount: 1,
        files: [singleRes.fileName],
      };
    }

    // 2. If single file download failed, check if it's a Google Drive folder using OAuth Token
    if (googleAccessToken) {
      try {
        const q = `'${fileOrFolderId}' in parents and trashed = false`;
        const listRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType)`,
          {
            headers: { Authorization: `Bearer ${googleAccessToken}` },
          }
        );

        if (listRes.ok) {
          const data = await listRes.json();
          const files = data.files || [];
          const downloadedFiles: string[] = [];

          for (const f of files) {
            if (f.mimeType === 'application/vnd.google-apps.folder') continue;
            const res = await downloadGDriveFileToWorkspace(f.id, targetFolder, googleAccessToken);
            if (res.success && res.fileName) {
              downloadedFiles.push(res.fileName);
            }
          }

          if (downloadedFiles.length > 0) {
            return {
              success: true,
              downloadedCount: downloadedFiles.length,
              files: downloadedFiles,
            };
          }
        }
      } catch (e) {
        console.warn('Google Drive folder list query failed:', e);
      }
    }

    return {
      success: false,
      downloadedCount: 0,
      files: [],
      error: singleRes.error || 'ไม่สามารถดึงไฟล์/โฟลเดอร์จาก Google Drive ได้ กรุณาเปลี่ยนสิทธิ์ลิงก์เป็น "Anyone with the link can view" หรือผูกบัญชี Google Drive ใน Member Portal',
    };
  } catch (err: any) {
    return {
      success: false,
      downloadedCount: 0,
      files: [],
      error: err.message,
    };
  }
}
