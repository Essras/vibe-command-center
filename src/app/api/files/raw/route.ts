import { getSafePath, serveRawFile } from '@/lib/fileUtils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reqPath = searchParams.get('path') || '.';
    const download = searchParams.get('download') === 'true';

    const targetPath = getSafePath(reqPath);
    return serveRawFile(req, targetPath, download);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
