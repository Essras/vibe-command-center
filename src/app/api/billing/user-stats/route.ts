import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const logs = db.tokenUsageLogs || [];

    // Filter logs for the current user only
    const userLogs = logs.filter(
      (l) => l.userId === currentUser.username || l.userId === currentUser.user?.id
    );

    const totalPromptTokens = userLogs.reduce((acc, l) => acc + (l.promptTokens || 0), 0);
    const totalCompletionTokens = userLogs.reduce((acc, l) => acc + (l.completionTokens || 0), 0);
    const totalTokens = totalPromptTokens + totalCompletionTokens;
    const totalCreditsUsed = userLogs.reduce((acc, l) => acc + (l.creditsDeducted || 0), 0);

    return NextResponse.json({
      success: true,
      username: currentUser.username,
      creditsBalance: currentUser.creditsBalance,
      user: currentUser.user,
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens,
      totalCreditsUsed: parseFloat(totalCreditsUsed.toFixed(4)),
      requestCount: userLogs.length,
      logs: userLogs.slice(0, 30), // Latest 30 personal usage logs
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
