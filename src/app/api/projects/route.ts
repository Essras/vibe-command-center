import { NextResponse } from 'next/server';
import { getDb, saveDb, Project } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();

    // Multi-tenant isolation logic: Everyone (including admin) sees only their own workspace
    let userProjects = db.projects.filter(
      (p) => p.userId === currentUser.username || (!p.userId && currentUser.username === 'admin')
    );

    // If new member has no projects, create a dedicated workspace
    if (userProjects.length === 0) {
      const defaultUserProj: Project = {
        id: `proj-${currentUser.username}-default`,
        userId: currentUser.username,
        name: `${currentUser.username}'s Workspace`,
        description: `Personal private workspace for ${currentUser.username}`,
        systemPrompt: 'You are a helpful Vibe AI Coding Assistant.',
        vpsFolder: `./workspace/${currentUser.username}`,
        createdAt: new Date().toISOString(),
      };
      db.projects.push(defaultUserProj);
      saveDb(db);
      userProjects = [defaultUserProj];
    }

    // Filter chat history for user's projects only
    const userChatHistory: Record<string, any> = {};
    userProjects.forEach((p) => {
      if (db.chatHistory[p.id]) {
        userChatHistory[p.id] = db.chatHistory[p.id];
      }
    });

    return NextResponse.json({
      projects: userProjects,
      activeModelId: db.activeModelId,
      autoFallback429: db.autoFallback429,
      favoriteModels: db.favoriteModels,
      chatHistory: userChatHistory,
      keys: currentUser.role === 'admin' ? db.keys : {}, // Reveal API keys only to admin for settings modal
      currentUser: {
        username: currentUser.username,
        role: currentUser.role,
        creditsBalance: currentUser.creditsBalance,
        googleConnected: currentUser.user?.googleConnected,
        googleEmail: currentUser.user?.googleEmail,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, project, keys, autoFallback429, favoriteModels, activeModelId } = body;
    const db = getDb();

    if (action === 'create_project') {
      const newProj: Project = {
        id: 'proj-' + Date.now(),
        userId: currentUser.username,
        name: project.name,
        description: project.description || '',
        systemPrompt: project.systemPrompt || '',
        vpsFolder: project.vpsFolder || `./workspace/${currentUser.username}`,
        createdAt: new Date().toISOString(),
      };
      db.projects.push(newProj);
      saveDb(db);
      return NextResponse.json({ success: true, project: newProj });
    }

    if (action === 'update_project') {
      const idx = db.projects.findIndex((p) => p.id === project.id);
      if (idx !== -1) {
        // Enforce Strict Privacy: Only the owner can update their project
        if (db.projects[idx].userId && db.projects[idx].userId !== currentUser.username) {
          return NextResponse.json({ error: 'Forbidden: Private project workspace' }, { status: 403 });
        }
        db.projects[idx] = { ...db.projects[idx], ...project };
        saveDb(db);
        return NextResponse.json({ success: true, project: db.projects[idx] });
      }
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (action === 'delete_project') {
      const targetProj = db.projects.find((p) => p.id === project.id);
      if (targetProj) {
        if (targetProj.userId && targetProj.userId !== currentUser.username) {
          return NextResponse.json({ error: 'Forbidden: Private project workspace' }, { status: 403 });
        }
      }
      db.projects = db.projects.filter((p) => p.id !== project.id);
      delete db.chatHistory[project.id];
      saveDb(db);
      return NextResponse.json({ success: true });
    }

    if (action === 'update_settings') {
      // Only Admin can update global AI provider keys
      if (currentUser.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Only Admin can update AI keys' }, { status: 403 });
      }
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
