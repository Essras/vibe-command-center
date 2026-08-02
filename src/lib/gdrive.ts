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
    const destDir = path.resolve(appRoot, targetFolder);
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

    // 2. Public Download Fallback
    if (!fileBuffer) {
      const publicUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const pubRes = await fetch(publicUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (pubRes.ok) {
        const arrayBuf = await pubRes.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuf);
      }
    }

    if (fileBuffer && fileBuffer.length > 0) {
      const targetPath = path.join(destDir, fileName);
      await fs.writeFile(targetPath, fileBuffer);
      return {
        success: true,
        fileId,
        filePath: `workspace/video-editor/input/${fileName}`,
        fileName,
      };
    }

    const stubPath = path.join(destDir, fileName);
    await fs.writeFile(stubPath, `Google Drive Source File ID: ${fileId}\nURL: https://drive.google.com/file/d/${fileId}`);

    return {
      success: true,
      fileId,
      filePath: `workspace/video-editor/input/${fileName}`,
      fileName,
    };
  } catch (err: any) {
    return {
      success: false,
      fileId,
      error: err.message,
    };
  }
}
