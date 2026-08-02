import { NextResponse } from 'next/server';
import fsSync from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appRoot = process.cwd();
    const workDir = path.join(appRoot, 'workspace/video-editor');

    // ── Job State: Read flag file (written before spawn, deleted on script completion) ──
    const flagPath = path.join(workDir, 'job_running.flag');
    const isRunning = fsSync.existsSync(flagPath);
    let jobStartedAt = '';
    if (isRunning) {
      try { jobStartedAt = fsSync.readFileSync(flagPath, 'utf-8').trim(); } catch (e) {}
    }

    // ── Live Log: Last 20 lines of auto_run.log ──
    let logContent = '';
    const autoLogPath = path.join(workDir, 'auto_run.log');
    if (fsSync.existsSync(autoLogPath)) {
      try {
        const rawLog = fsSync.readFileSync(autoLogPath, 'utf-8');
        logContent = rawLog.split('\n').filter(Boolean).slice(-20).join('\n');
      } catch (e) {}
    }

    // ── Output Files ──
    const outputDir = path.join(appRoot, 'workspace/video-editor/output');
    let outputFiles: { name: string; sizeMB: string; modified: string }[] = [];
    if (fsSync.existsSync(outputDir)) {
      const entries = fsSync.readdirSync(outputDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() && entry.name !== '.gitkeep') {
          const stat = fsSync.statSync(path.join(outputDir, entry.name));
          outputFiles.push({
            name: entry.name,
            sizeMB: (stat.size / (1024 * 1024)).toFixed(1),
            modified: stat.mtime.toISOString(),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      status: isRunning ? 'PROCESSING' : 'IDLE',
      isRunning,
      activeProcessesCount: isRunning ? 1 : 0,
      runningProcesses: isRunning ? [`[JOB RUNNING since ${jobStartedAt}]`] : [],
      outputFiles,
      logContent,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
