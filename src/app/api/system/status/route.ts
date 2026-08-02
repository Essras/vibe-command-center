import { NextResponse } from 'next/server';
import child_process from 'child_process';
import util from 'util';
import fsSync from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';

const execPromise = util.promisify(child_process.exec);

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let runningProcesses: string[] = [];

    // 1. Direct Linux /proc filesystem inspection (works on Alpine, Debian, Ubuntu Docker containers 100%)
    try {
      if (fsSync.existsSync('/proc')) {
        const pids = fsSync.readdirSync('/proc').filter((f) => /^\d+$/.test(f));
        for (const pid of pids) {
          try {
            const cmdline = fsSync.readFileSync(`/proc/${pid}/cmdline`, 'utf-8').replace(/\0/g, ' ').trim();
            if (
              cmdline &&
              !cmdline.includes('status/route') &&
              (cmdline.includes('python') ||
                cmdline.includes('ffmpeg') ||
                cmdline.includes('auto_run') ||
                cmdline.includes('whisper'))
            ) {
              runningProcesses.push(`[PID ${pid}] ${cmdline}`);
            }
          } catch (e) {
            // Process terminated or non-readable
          }
        }
      }
    } catch (e) {
      // Fallback
    }

    // 2. Fallback to command execution if /proc scanner found nothing
    if (runningProcesses.length === 0) {
      try {
        const cmd = process.platform === 'win32'
          ? 'tasklist'
          : 'ps -ef | grep -E "python3|ffmpeg|auto_run|whisper" | grep -v grep';
        const { stdout } = await execPromise(cmd);
        runningProcesses = stdout
          .trim()
          .split('\n')
          .filter((line) => {
            const l = line.trim();
            return (
              l &&
              (l.includes('python') ||
                l.includes('ffmpeg') ||
                l.includes('auto_run') ||
                l.includes('whisper'))
            );
          });
      } catch (e) {
        // No processes running
      }
    }

    // Check output files in workspace/video-editor/output
    const appRoot = process.cwd();
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

    // Check generated auto_run script logs in workspace/video-editor
    const workDir = path.join(appRoot, 'workspace/video-editor');
    let activeScripts: string[] = [];
    if (fsSync.existsSync(workDir)) {
      activeScripts = fsSync
        .readdirSync(workDir)
        .filter((f) => f.startsWith('auto_run_') && f.endsWith('.sh'));
    }

    // Check auto_run.log for real-time live logs
    let logContent = '';
    const autoLogPath = path.join(workDir, 'auto_run.log');
    if (fsSync.existsSync(autoLogPath)) {
      try {
        const rawLog = fsSync.readFileSync(autoLogPath, 'utf-8');
        const lines = rawLog.split('\n').filter(Boolean);
        logContent = lines.slice(-20).join('\n');
      } catch (e) {}
    }

    const isRunning = runningProcesses.length > 0;

    return NextResponse.json({
      success: true,
      status: isRunning ? 'PROCESSING' : 'IDLE',
      isRunning,
      activeProcessesCount: runningProcesses.length,
      runningProcesses,
      activeScriptsCount: activeScripts.length,
      activeScripts,
      outputFiles,
      logContent,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
