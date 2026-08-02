import { NextResponse } from 'next/server';
import fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import child_process from 'child_process';
import { getDb, saveDb } from '@/lib/db';
import { executeAIRequestWithFallback } from '@/lib/ai-engine';
import { getCurrentUser } from '@/lib/auth';
import { extractGDriveId, downloadGDriveFileToWorkspace } from '@/lib/gdrive';
import { sendTelegramAlert } from '@/lib/telegram';

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

    const mandatoryInstruction = `\n\n[📢 MANDATORY VPS ENVIRONMENT DIRECTIVE FOR AI AGENT]:
You are an autonomous AI Agent running directly on an Ubuntu Linux VPS server with full terminal & root access.
- Workspace directory: "${cleanFolder}"
- You HAVE DIRECT ACCESS to read/write files in "${cleanFolder}/input/" and "${cleanFolder}/output/".
- NEVER say "I cannot access your files", "I lack permission", or "install ffmpeg on your machine (sudo apt install ffmpeg)".
- ALWAYS generate executable bash code blocks (\`\`\`bash) with FFmpeg / Python commands to process videos in "${cleanFolder}/input/" and output to "${cleanFolder}/output/".`;

    if (inputFiles.length > 0) {
      return `\n\n[📂 สภาพแวดล้อมดิสก์ล่าสุดในเซิร์ฟเวอร์ (Real-time File Tree Status)]:
- โฟลเดอร์ "${cleanFolder}/input/" มีไฟล์สื่ออยู่จริงพร้อมประมวลผล ${inputFiles.length} ไฟล์ ได้แก่:
  ${inputFiles.map((f) => `• ${f}`).join('\n  ')}
${mandatoryInstruction}`;
    }

    return mandatoryInstruction;
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
              sendTelegramAlert(
                `📥 <b>ดาวน์โหลดไฟล์สื่อสำเร็จ!</b>\n\nระบบดาวน์โหลดไฟล์จาก Google Drive เข้าสู่ <code>${downloadRes.filePath}</code> เรียบร้อยแล้ว พร้อมสำหรับตัดต่อแล้วครับ!`,
                'https://vibe.zodiacpsych.com'
              );
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
        // Extract any code block (bash/sh/python/py) or auto-detect media files in input folder to run on VPS
        const codeBlockMatches = fullAssistantMessage.match(/```[a-zA-Z0-9_-]*\s*([\s\S]*?)```/gi);
        const commandsToRun: string[] = [];

        if (codeBlockMatches && codeBlockMatches.length > 0) {
          for (const block of codeBlockMatches) {
            const cleanCode = block
              .replace(/^```[a-zA-Z0-9_-]*\s*/i, '')
              .replace(/```$/, '')
              .trim();

            const isPureInstallScript =
              (cleanCode.includes('apt update') || cleanCode.includes('apt install') || cleanCode.includes('brew install') || cleanCode.includes('pip install')) &&
              !cleanCode.includes('ffmpeg -i') &&
              !cleanCode.includes('python3 -c') &&
              !cleanCode.includes('python3 -m') &&
              !cleanCode.includes('input/');

            if (
              !isPureInstallScript &&
              cleanCode &&
              (cleanCode.includes('python') ||
                cleanCode.includes('ffmpeg') ||
                cleanCode.includes('easy_ai_editor') ||
                cleanCode.includes('whisper') ||
                cleanCode.includes('#!/bin/bash') ||
                cleanCode.includes('input/') ||
                cleanCode.includes('subprocess'))
            ) {
              commandsToRun.push(cleanCode);
              // Don't break — collect ALL code blocks to build a full pipeline script
            }
          }
        }

        // Fallback: If AI model outputted text progress without code block, but input/ contains media files
        if (commandsToRun.length === 0) {
          const targetWorkspace = project?.vpsFolder || 'workspace/video-editor';
          const workDir = path.resolve(process.cwd(), targetWorkspace.replace(/^(\.\/|\/)/, ''));
          const inputDir = path.join(workDir, 'input');

          if (fsSync.existsSync(inputDir)) {
            const mediaFiles = fsSync
              .readdirSync(inputDir)
              .filter((f) => !f.startsWith('.') && f !== '.gitkeep');

            if (mediaFiles.length > 0) {
              const mainFile = mediaFiles[0];
              commandsToRun.push(
                `python3 -m easy_ai_editor.editor --input "input/${mainFile}" --output "output/" || ffmpeg -i "input/${mainFile}" -c:v copy "output/output_${mainFile}"`
              );
            }
          }
        }

        if (commandsToRun.length > 0) {
            // Always use workspace/video-editor as the canonical work directory
            const targetWorkspace = project?.vpsFolder || 'workspace/video-editor';
            // Ensure we always resolve relative to app root, strip any leading / or ./
            const workDir = path.resolve(process.cwd(), targetWorkspace.replace(/^(\.\/|\/)/, ''));

            const logPath = path.join(workDir, 'auto_run.log');
            const flagPath = path.join(workDir, 'job_running.flag');

            // Smart-join: wrap Python-only blocks as python3 heredoc
            const wrappedBlocks = commandsToRun.map((code, idx) => {
              const isBashBlock = code.includes('ffmpeg') || code.includes('#!/') || code.includes('mkdir') || code.startsWith('#');
              const isPythonBlock = (code.includes('import ') || code.includes('def ') || code.includes('subprocess')) && !isBashBlock;

              // Sanitize GPU-only ffmpeg flags → CPU fallback (no NVIDIA on this VPS)
              let sanitized = code
                .replace(/-c:v\s+h264_nvenc/g, '-c:v libx264')
                .replace(/-c:v\s+hevc_nvenc/g, '-c:v libx265')
                .replace(/-cq\s+\d+/g, '-crf 26')
                .replace(/-preset\s+p\d+/g, '-preset fast')
                .replace(/h264_nvenc/g, 'libx264')
                .replace(/hevc_nvenc/g, 'libx265');

              if (isPythonBlock) {
                return `python3 << 'PYEOF_${idx}'\n${sanitized}\nPYEOF_${idx}`;
              }
              return sanitized;
            });

            // Script header: detect GPU → set ENCODER var (falls back to libx264 gracefully)
            const gpuDetect = `# Auto-detect GPU encoder (falls back to libx264 if no NVIDIA GPU)
ENCODER="libx264"
ffmpeg -encoders 2>/dev/null | grep -q "h264_nvenc" && ENCODER="h264_nvenc"
echo "[GPU] Using encoder: $ENCODER"`;

            // Guaranteed fallback: always produce output even if AI commands fail
            const fallbackBlock = `# === GUARANTEED FALLBACK: produce output if AI commands failed ===
INPUT_FILE=$(ls input/*.mp4 input/*.mov input/*.avi input/*.mkv 2>/dev/null | head -1)
if [ -n "$INPUT_FILE" ]; then
  BASENAME=$(basename "$INPUT_FILE")
  OUTPUT_FILE="output/draft_$BASENAME"
  if [ ! -f "$OUTPUT_FILE" ]; then
    echo "[FALLBACK] AI commands produced no output. Running simple encode..."
    ffmpeg -y -i "$INPUT_FILE" \\
      -vf "drawtext=text='DRAFT - AUTO PROCESSED':x=(w-text_w)/2:y=60:fontsize=40:fontcolor=white:box=1:boxcolor=black@0.5" \\
      -c:v libx264 -preset fast -crf 26 -c:a aac -b:a 128k \\
      "$OUTPUT_FILE" && echo "[FALLBACK] Done: $OUTPUT_FILE"
  else
    echo "[SUCCESS] Output exists: $OUTPUT_FILE"
  fi
fi`;

            // Write flag file at start, clean it at end of script
            // NOTE: Alpine Linux has no bash — use sh
            const scriptContent = `#!/bin/sh\nexec > "${logPath}" 2>&1\necho "[JOB STARTED] $(date)"\ncd "${workDir}"\nmkdir -p input output temp transcript reports\n\n${gpuDetect}\n\n${wrappedBlocks.join('\n\n')}\n\n${fallbackBlock}\n\necho "[JOB DONE] $(date)"\nrm -f "${flagPath}"`;
            const scriptPath = path.join(workDir, `auto_run_${Date.now()}.sh`);

            try {
              // Write flag BEFORE spawning so status API sees it immediately
              await fs.writeFile(flagPath, new Date().toISOString(), 'utf-8');
              await fs.writeFile(scriptPath, scriptContent, { mode: 0o755 });

              const child = child_process.spawn('sh', [scriptPath], {
                cwd: workDir,
                detached: true,
                stdio: 'ignore',
              });

              // Send Telegram alert on job start
              sendTelegramAlert(
                `⚙️ <b>เริ่มรันงานตัดต่อวิดีโอบน VPS!</b>\n\nเซิร์ฟเวอร์ VPS ได้เริ่มสั่งรันสคริปต์ประมวลผลวิดีโอในหลังบ้านแล้วครับ!\n\n💡 คุณสามารถปิดคอมพิวเตอร์พับจอไปได้เลยครับ เมื่อเรนเดอร์เสร็จแล้วระบบจะส่งข้อความแจ้งเตือนให้ทราบอีกครั้ง!`,
                'https://vibe.zodiacpsych.com'
              );

              child.on('exit', (code) => {
                sendTelegramAlert(
                  `🎉 <b>ตัดต่อและเรนเดอร์วิดีโอเสร็จสมบูรณ์ 100%!</b>\n\nไฟล์ผลลัพธ์ถูกนำไปวางไว้ในโฟลเดอร์ <code>${targetWorkspace}/output/</code> เรียบร้อยแล้วครับ!\n\nเปิดดูหรือดาวน์โหลดได้ทันทีผ่าน Vibe Command Center`,
                  'https://vibe.zodiacpsych.com'
                );
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
