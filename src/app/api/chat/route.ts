import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { executeAIRequestWithFallback } from '@/lib/ai-engine';

import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, messages, modelId } = body;

    const db = getDb();
    const project = db.projects.find((p) => p.id === projectId);

    // Enforce Tenant Boundary & Admin Privacy Governance (Strictly owner only)
    if (project && project.userId && project.userId !== currentUser.username) {
      return NextResponse.json({ error: 'Forbidden: You do not own this project workspace' }, { status: 403 });
    }

    const systemPrompt = project ? project.systemPrompt : undefined;
    const selectedModel = modelId || db.activeModelId;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let fullAssistantMessage = '';
        let finalModelUsed = selectedModel;

        await executeAIRequestWithFallback(
          {
            messages,
            modelId: selectedModel,
            systemPrompt,
            keys: db.keys,
            favoriteModels: db.favoriteModels,
            autoFallback429: db.autoFallback429,
          },
          (chunk) => {
            if (chunk.fallbackNotice) {
              fullAssistantMessage += chunk.fallbackNotice;
            }
            if (chunk.text) {
              fullAssistantMessage += chunk.text;
            }
            if (chunk.modelUsed) {
              finalModelUsed = chunk.modelUsed;
            }
            
            const payload = JSON.stringify(chunk);
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        );

        // Save chat history to DB
        if (projectId && fullAssistantMessage) {
          const userMsg = messages[messages.length - 1];
          if (!db.chatHistory[projectId]) {
            db.chatHistory[projectId] = [];
          }
          db.chatHistory[projectId].push({
            id: 'msg-' + Date.now() + '-user',
            projectId,
            role: 'user',
            content: userMsg.content,
            attachments: userMsg.attachments,
            timestamp: new Date().toISOString(),
          });
          db.chatHistory[projectId].push({
            id: 'msg-' + Date.now() + '-assistant',
            projectId,
            role: 'assistant',
            content: fullAssistantMessage,
            modelUsed: finalModelUsed,
            timestamp: new Date().toISOString(),
          });
          saveDb(db);
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const db = getDb();

    if (projectId) {
      const project = db.projects.find((p) => p.id === projectId);
      if (project && project.userId && project.userId !== currentUser.username) {
        return NextResponse.json({ error: 'Forbidden: Private workspace' }, { status: 403 });
      }
      return NextResponse.json({ messages: db.chatHistory[projectId] || [] });
    }

    // Filter user's own accessible projects only (Strict Privacy Policy: Admin cannot see other users' private chats)
    const userProjects = db.projects.filter(
      (p) => p.userId === currentUser.username || (!p.userId && currentUser.username === 'admin')
    );
    const userChatHistory: Record<string, any> = {};
    userProjects.forEach((p) => {
      if (db.chatHistory[p.id]) {
        userChatHistory[p.id] = db.chatHistory[p.id];
      }
    });

    return NextResponse.json({ chatHistory: userChatHistory });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const db = getDb();
    const project = db.projects.find((p) => p.id === projectId);
    if (project && project.userId && project.userId !== currentUser.username) {
      return NextResponse.json({ error: 'Forbidden: Private workspace' }, { status: 403 });
    }

    // Permanently delete chat history for this project
    delete db.chatHistory[projectId];
    saveDb(db);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
