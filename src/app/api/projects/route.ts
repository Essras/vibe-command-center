import { NextResponse } from 'next/server';
import { getDb, saveDb, Project, ProviderKeys, FavoriteModel } from '@/lib/db';

export async function GET() {
  const db = getDb();
  return NextResponse.json(db);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, project, keys, autoFallback429, favoriteModels, activeModelId } = body;
    const db = getDb();

    if (action === 'create_project') {
      const newProj: Project = {
        id: 'proj-' + Date.now(),
        name: project.name,
        description: project.description || '',
        systemPrompt: project.systemPrompt || '',
        vpsFolder: project.vpsFolder || './workspace',
        createdAt: new Date().toISOString(),
      };
      db.projects.push(newProj);
      saveDb(db);
      return NextResponse.json({ success: true, project: newProj });
    }

    if (action === 'update_project') {
      const idx = db.projects.findIndex((p) => p.id === project.id);
      if (idx !== -1) {
        db.projects[idx] = { ...db.projects[idx], ...project };
        saveDb(db);
        return NextResponse.json({ success: true, project: db.projects[idx] });
      }
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (action === 'delete_project') {
      db.projects = db.projects.filter((p) => p.id !== project.id);
      delete db.chatHistory[project.id];
      saveDb(db);
      return NextResponse.json({ success: true });
    }

    if (action === 'update_settings') {
      if (keys) db.keys = { ...db.keys, ...keys };
      if (typeof autoFallback429 === 'boolean') db.autoFallback429 = autoFallback429;
      if (favoriteModels) db.favoriteModels = favoriteModels;
      if (activeModelId) db.activeModelId = activeModelId;
      saveDb(db);
      return NextResponse.json({ success: true, db });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
