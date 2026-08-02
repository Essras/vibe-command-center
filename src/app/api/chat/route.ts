import { NextResponse } from 'next/server';
import fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import child_process from 'child_process';
import { getDb, saveDb } from '@/lib/db';
import { executeAIRequestWithFallback } from '@/lib/ai-engine';
import { getCurrentUser } from '@/lib/auth';
import { extractGDriveId, downloadGDriveFileToWorkspace } from '@/lib/gdrive';

function getWorkspaceFileContext(vpsFolder: string = 'workspace/video-editor'): string {
  try {
    const appRoot = process.cwd();
    const cleanFolder = vpsFolder.trim().replace(/^(\.\/|\/)/, '');
    const targetDir = path.resolve(appRoot, cleanFolder);

    if (!fsSync.existsSync(targetDir)) {
      return '';
    }

    const inputDir = path.join(targetDir, 'input');
    const inputFiles: string[] = [];

    if (fsSync.existsSync(inputDir)) {
      const entries = fsSync.readdirSync(inputDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() && entry.name !== '.gitkeep') {
          const stat = fsSync.statSync(path.join(inputDir, entry.name));
          const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);
          inputFiles.push(`${entry.name} (ขนาด: ${sizeMB} MB)`);
        }
      }
    }

    if (inputFiles.length > 0) {
      return `\n\n[📂 สภาพแวดล้อมดิสก์ล่าสุดในเซิร์ฟเวอร์ (Real-time File Tree Status)]:
- โฟลเดอร์ "${cleanFolder}/input/" มีไฟล์สื่ออยู่จริงพร้อมประมวลผล ${inputFiles.length} ไฟล์ ได้แก่:
  ${inputFiles.map((f) => `• ${f}`).join('\n  ')}

คำสั่งบังคับสำหรับ AI Agent:
ไฟล์ทั้งหมดข้างต้นมีอยู่จริงบนดิสก์ระบบแล้ว ห้ามตอบปฏิเสธว่า "ไม่พบไฟล์" หรือ "ให้ลากไฟล์มาวาง" เด็ดขาด! จงนำไฟล์สื่อในโฟลเดอร์ input/ ข้างต้นไปรันคำสั่งตัดต่อวิดีโอ (FFmpeg / Faster-Whisper / Easy AI Editor) ได้ทันที!`;
    }

    return '';
  } catch (e) {
    return '';
  }
}

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

    const baseSystemPrompt = project ? project.systemPrompt : '';
    const workspaceContext = getWorkspaceFileContext(project?.vpsFolder || 'workspace/video-editor');
    const systemPrompt = `${baseSystemPrompt}${workspaceContext}`;
    const selectedModel = modelId || db.activeModelId;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let fullAssistantMessage = '';
        let finalModelUsed = selectedModel;

        // Pre-process Google Drive links in user attachments or message content
        const processedMessages = JSON.parse(JSON.stringify(messages));
        const lastUserMsg = processedMessages[processedMessages.length - 1];

        if (lastUserMsg && lastUserMsg.role === 'user') {
          let gdriveId: string | null = null;

          if (lastUserMsg.attachments && Array.isArray(lastUserMsg.attachments)) {
            for (const att of lastUserMsg.attachments) {
              if (att.type === 'application/gdrive' || (att.content && att.content.includes('drive.google.com'))) {
                gdriveId = extractGDriveId(att.content || att.name);
                if (gdriveId) break;
              }
            }
          }

          if (!gdriveId && lastUserMsg.content) {
            gdriveId = extractGDriveId(lastUserMsg.content);
          }

          if (gdriveId) {
            const targetWorkspace = project?.vpsFolder || 'workspace/video-editor';
            const targetInputFolder = `${targetWorkspace}/input`;

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ text: `⚡ 📥 กำลังเชื่อมต่อและดาวน์โหลดไฟล์จาก Google Drive (ID: ${gdriveId}) เข้าสู่โฟลเดอร์ input/ ...\n\n` })}\n\n`
              )
            );

            const downloadRes = await downloadGDriveFileToWorkspace(
              gdriveId,
              targetInputFolder,
              currentUser.user?.googleAccessToken
            );

            if (downloadRes.success) {
              lastUserMsg.content += `\n\n[📢 ระบบเซิร์ฟเวอร์แจ้งเตือน AI: ได้ทำการดาวน์โหลดไฟล์สื่อจาก Google Drive (ID: ${gdriveId}) เข้าสู่โฟลเดอร์ "${downloadRes.filePath}" เรียบร้อยแล้ว! ไฟล์พร้อมใช้งานสำหรับกระบวนการตัดต่อ, FFmpeg, Python และ Easy AI Editor แล้ว จงเริ่มประมวลผลต่อได้ทันที]`;
            }
          }
        }

        await executeAIRequestWithFallback(
          {
            messages: processedMessages,
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

        // 🚀 AUTOMATIC VPS BACKGROUND EXECUTION PIPELINE
        // Extract bash/sh code blocks or python3/ffmpeg commands and auto-run on VPS
        const codeBlockMatches = fullAssistantMessage.match(/```(?:bash|sh|shell)?\s*([\s\S]*?)```/gi);
        if (codeBlockMatches && codeBlockMatches.length > 0) {
          const commandsToRun: string[] = [];
          for (const block of codeBlockMatches) {
            const cleanCode = block
              .replace(/^```(?:bash|sh|shell)?\s*/i, '')
              .replace(/```$/, '')
              .trim();

            const lines = cleanCode.split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (
                trimmed &&
                !trimmed.startsWith('#') &&
                (trimmed.includes('python') || trimmed.includes('ffmpeg') || trimmed.includes('easy_ai_editor') || trimmed.includes('whisper'))
              ) {
                commandsToRun.push(trimmed);
              }
            }
          }

          if (commandsToRun.length > 0) {
            const targetWorkspace = project?.vpsFolder || 'workspace/video-editor';
            const workDir = path.resolve(process.cwd(), targetWorkspace.replace(/^(\.\/|\/)/, ''));

            const scriptContent = `#!/bin/bash\ncd "${workDir}"\n` + commandsToRun.join('\n');
            const scriptPath = path.join(workDir, `auto_run_${Date.now()}.sh`);

            try {
              await fs.writeFile(scriptPath, scriptContent, { mode: 0o755 });

              const child = child_process.spawn('bash', [scriptPath], {
                cwd: workDir,
                detached: true,
                stdio: 'ignore',
              });
              child.unref();

              const autoExecNotice = `\n\n---\n⚡ 🚀 **[ระบบทำการรันสคริปต์ในหลังบ้านให้อัตโนมัติ 100% (Auto VPS Background Execution)]:**\nเซิร์ฟเวอร์ VPS ได้ทำการสั่งรันสคริปต์ประมวลผลตัดต่อวิดีโอนี้ในเบื้องหลังให้อัตโนมัติเรียบร้อยแล้ว!\n• **สคริปต์ที่รันบน VPS**: \n\`\`\`bash\n${commandsToRun.join('\n')}\n\`\`\`\n• **โฟลเดอร์ผลลัพธ์**: \`${targetWorkspace}/output/\`\n💡 **คุณสามารถปิดคอมพิวเตอร์พับจอไปได้ทันทีครับ!** เซิร์ฟเวอร์จะทำงานต่อในหลังบ้านจนเสร็จสมบูรณ์ และส่งไฟล์ผลลัพธ์ไปเก็บในโฟลเดอร์ \`output/\` สำหรับเปิดดูเมื่อคุณเปิดคอมกลับมา`;

              fullAssistantMessage += autoExecNotice;

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: autoExecNotice })}\n\n`)
              );
            } catch (e: any) {
              console.error('Auto exec error:', e);
            }
          }
        }

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
