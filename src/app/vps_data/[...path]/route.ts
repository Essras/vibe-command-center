import { getSafePath, serveRawFile } from '@/lib/fileUtils';

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  try {
    const rawPath = (params.path || []).join('/');
    const { searchParams } = new URL(req.url);
    const download = searchParams.get('download') === 'true';

    const targetPath = getSafePath(rawPath);
    return serveRawFile(req, targetPath, download);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
