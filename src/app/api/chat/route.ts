import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { executeAIRequestWithFallback } from '@/lib/ai-engine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, messages, modelId } = body;

    const db = getDb();
    const project = db.projects.find((p) => p.id === projectId);
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
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const db = getDb();
  if (projectId) {
    return NextResponse.json({ messages: db.chatHistory[projectId] || [] });
  }
  return NextResponse.json({ chatHistory: db.chatHistory });
}
