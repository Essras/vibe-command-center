import path from 'path';
import fsSync from 'fs';

export function getSafePath(relativePath: string): string {
  const vpsRoot = process.env.VPS_ROOT_PATH;
  const appRoot = process.cwd();

  let cleanPath = (relativePath || '.').trim().replace(/^(\.\/|\/)/, '');

  if (cleanPath.startsWith('workspace') || cleanPath === '.' || !cleanPath) {
    const appTarget = path.resolve(appRoot, cleanPath || '.');
    if (fsSync.existsSync(appTarget)) {
      return appTarget;
    }
  }

  if (vpsRoot && fsSync.existsSync(vpsRoot)) {
    const vpsProjectTarget = path.resolve(vpsRoot, 'root/vibe-command-center', cleanPath);
    if (fsSync.existsSync(vpsProjectTarget)) {
      return vpsProjectTarget;
    }

    const vpsDirectTarget = path.resolve(vpsRoot, cleanPath);
    if (fsSync.existsSync(vpsDirectTarget)) {
      return vpsDirectTarget;
    }
  }

  return path.resolve(appRoot, cleanPath || '.');
}

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.mov':
      return 'video/quicktime';
    case '.avi':
      return 'video/x-msvideo';
    case '.mkv':
      return 'video/x-matroska';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.ico':
      return 'image/x-icon';
    case '.mp3':
      return 'audio/mpeg';
    case '.wav':
      return 'audio/wav';
    case '.ogg':
      return 'audio/ogg';
    case '.m4a':
      return 'audio/mp4';
    case '.pdf':
      return 'application/pdf';
    case '.json':
      return 'application/json';
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
    case '.mjs':
      return 'text/javascript; charset=utf-8';
    case '.txt':
    case '.log':
    case '.srt':
    case '.vtt':
    case '.md':
    case '.py':
    case '.sh':
      return 'text/plain; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

export function serveRawFile(req: Request, targetPath: string, downloadParam: boolean = false): Response {
  if (!fsSync.existsSync(targetPath)) {
    return new Response(JSON.stringify({ error: 'File not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stat = fsSync.statSync(targetPath);
  if (stat.isDirectory()) {
    return new Response(JSON.stringify({ error: 'Path is a directory' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fileSize = stat.size;
  const mimeType = getMimeType(targetPath);
  const filename = path.basename(targetPath);
  const dispositionType = downloadParam ? 'attachment' : 'inline';
  const encodedFilename = encodeURIComponent(filename);

  const range = req.headers.get('range');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (isNaN(start) || start >= fileSize || end >= fileSize || start > end) {
      return new Response(null, {
        status: 416,
        headers: {
          'Content-Range': `bytes */${fileSize}`,
        },
      });
    }

    const chunkSize = end - start + 1;
    const stream = new ReadableStream({
      start(controller) {
        const nodeStream = fsSync.createReadStream(targetPath, { start, end });
        nodeStream.on('data', (chunk) => controller.enqueue(chunk));
        nodeStream.on('end', () => controller.close());
        nodeStream.on('error', (err) => controller.error(err));
      },
    });

    return new Response(stream as any, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': mimeType,
        'Content-Disposition': `${dispositionType}; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'no-cache',
      },
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      const nodeStream = fsSync.createReadStream(targetPath);
      nodeStream.on('data', (chunk) => controller.enqueue(chunk));
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err) => controller.error(err));
    },
  });

  return new Response(stream as any, {
    status: 200,
    headers: {
      'Accept-Ranges': 'bytes',
      'Content-Length': fileSize.toString(),
      'Content-Type': mimeType,
      'Content-Disposition': `${dispositionType}; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
      'Cache-Control': 'no-cache',
    },
  });
}
