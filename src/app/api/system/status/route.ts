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
    try {
      const { stdout } = await execPromise('ps aux | grep -E "python3|ffmpeg|auto_run" | grep -v grep');
      runningProcesses = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => line.trim());
    } catch (e) {
      runningProcesses = [];
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
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
