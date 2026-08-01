// Admin Analytics & Token Metering Dashboard API Route
// Path: /app/api/admin/dashboard/route.ts

import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { ALL_MODELS_LIST } from '@/lib/ai/router';

export async function GET() {
  try {
    const db = getDb();

    const logs = db.tokenUsageLogs || [];
    const users = db.users || [];
    const topups = db.topupLogs || [];

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const currentMinuteStr = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM

    // Filter logs for today & current minute
    const todayLogs = logs.filter((l) => l.timestamp && l.timestamp.startsWith(todayStr));
    const minuteLogs = logs.filter((l) => l.timestamp && l.timestamp.startsWith(currentMinuteStr));

    // Calculate aggregated metrics
    const totalPromptTokens = logs.reduce((acc, l) => acc + (l.promptTokens || 0), 0);
    const totalCompletionTokens = logs.reduce((acc, l) => acc + (l.completionTokens || 0), 0);
    const totalTokens = totalPromptTokens + totalCompletionTokens;
    const totalCreditsDeducted = logs.reduce((acc, l) => acc + (l.creditsDeducted || 0), 0);
    const totalCostInUSD = parseFloat((totalCreditsDeducted / 100).toFixed(4)); // 1 USD = 100 Credits

    // Model Category usage breakdown
    const categoryUsage: Record<string, { count: number; credits: number; tokens: number }> = {
      FAST_MODEL: { count: 0, credits: 0, tokens: 0 },
      BALANCED_MODEL: { count: 0, credits: 0, tokens: 0 },
      REASONING_MODEL: { count: 0, credits: 0, tokens: 0 },
      VISION_MODEL: { count: 0, credits: 0, tokens: 0 },
      OTHER: { count: 0, credits: 0, tokens: 0 },
    };

    logs.forEach((log) => {
      const modelDef = ALL_MODELS_LIST.find((m) => m.id === log.modelUsed);
      const cat = modelDef ? modelDef.category : 'OTHER';
      if (!categoryUsage[cat]) {
        categoryUsage[cat] = { count: 0, credits: 0, tokens: 0 };
      }
      categoryUsage[cat].count += 1;
      categoryUsage[cat].credits += log.creditsDeducted || 0;
      categoryUsage[cat].tokens += (log.promptTokens || 0) + (log.completionTokens || 0);
    });

    // Provider usage breakdown for today (Gemini, OKMD, OpenRouter, OpenAI, Claude)
    const geminiTodayCount = todayLogs.filter(
      (l) => l.modelUsed.toLowerCase().includes('gemini') || l.modelUsed.toLowerCase().includes('google')
    ).length;
    const geminiMinuteCount = minuteLogs.filter(
      (l) => l.modelUsed.toLowerCase().includes('gemini') || l.modelUsed.toLowerCase().includes('google')
    ).length;

    const okmdTodayLogs = todayLogs.filter((l) => l.modelUsed.toLowerCase().includes('okmd'));
    const okmdTodayCount = okmdTodayLogs.length;
    const okmdTodayTokens = okmdTodayLogs.reduce((acc, l) => acc + (l.promptTokens || 0) + (l.completionTokens || 0), 0);

    const openrouterTodayCount = todayLogs.filter((l) => l.modelUsed.includes('/')).length;
    const openaiTodayCount = todayLogs.filter(
      (l) => l.modelUsed.toLowerCase().includes('gpt') || l.modelUsed.toLowerCase().includes('o3')
    ).length;

    // OKMD Live Quota Fetch
    let okmdLiveQuota: any = null;
    const okmdKey = db.keys?.okmdApiKey?.trim();
    const okmdBaseUrl = db.keys?.okmdBaseUrl?.trim() || 'https://gen.ai.kku.ac.th/okmd/api/v1';

    if (okmdKey) {
      try {
        const okmdRes = await fetch(`${okmdBaseUrl}/user/quota`, {
          headers: { Authorization: `Bearer ${okmdKey}` },
        });
        if (okmdRes.ok) {
          okmdLiveQuota = await okmdRes.json();
        } else {
          // Try alternative endpoint /quota or /user/me
          const altRes = await fetch(`${okmdBaseUrl}/quota`, {
            headers: { Authorization: `Bearer ${okmdKey}` },
          });
          if (altRes.ok) {
            okmdLiveQuota = await altRes.json();
          }
        }
      } catch (e) {
        // Fallback to internal token calculation
      }
    }

    // User / Tenant summaries
    const userSummaries = users.map((u) => {
      const userLogs = logs.filter((l) => l.userId === u.id || l.userId === u.username);
      const userTokens = userLogs.reduce((acc, l) => acc + (l.promptTokens || 0) + (l.completionTokens || 0), 0);
      const userCreditsUsed = userLogs.reduce((acc, l) => acc + (l.creditsDeducted || 0), 0);

      return {
        id: u.id,
        username: u.username,
        role: u.role,
        creditsBalance: u.creditsBalance ?? 100.0,
        totalTokens: userTokens,
        totalCreditsUsed: parseFloat(userCreditsUsed.toFixed(4)),
        requestCount: userLogs.length,
      };
    });

    // Fetch OpenRouter API Credit Balance if key is available
    let openrouterBalanceUSD: number | null = null;
    if (db.keys?.openrouterApiKey?.trim()) {
      try {
        const orRes = await fetch('https://openrouter.ai/api/v1/credits', {
          headers: {
            Authorization: `Bearer ${db.keys.openrouterApiKey.trim()}`,
          },
        });
        if (orRes.ok) {
          const orData = await orRes.json();
          if (orData.data) {
            const totalCredits = orData.data.total_credits || 0;
            const totalUsage = orData.data.total_usage || 0;
            openrouterBalanceUSD = Math.max(0, parseFloat((totalCredits - totalUsage).toFixed(4)));
          }
        }
      } catch (e) {
        console.error('Failed to fetch OpenRouter quota:', e);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalPromptTokens,
        totalCompletionTokens,
        totalTokens,
        totalCreditsDeducted: parseFloat(totalCreditsDeducted.toFixed(4)),
        totalCostInUSD,
        userCount: users.length,
        requestCount: logs.length,
      },
      categoryUsage,
      freeModelQuotas: {
        gemini: {
          rpdUsed: geminiTodayCount,
          rpdLimit: 1500, // Google AI Studio Free Tier RPD
          rpmUsed: geminiMinuteCount,
          rpmLimit: 15,   // Google AI Studio Free Tier RPM
          rpdPct: Math.min(100, Math.round((geminiTodayCount / 1500) * 100)),
          rpmPct: Math.min(100, Math.round((geminiMinuteCount / 15) * 100)),
        },
        okmd: {
          todayRequests: okmdTodayCount,
          todayTokens: okmdTodayTokens,
          liveQuota: okmdLiveQuota,
          officialDailyLimits: {
            DeepSeek: 1000000,
            OpenAI: 350000,
            Gemini: 200000,
            Claude: 180000,
            MetaAI: 200000,
            xAI: 100000,
          },
        },
        openrouter: {
          todayRequests: openrouterTodayCount,
          balanceUSD: openrouterBalanceUSD,
        },
        openai: {
          todayRequests: openaiTodayCount,
        },
      },
      userSummaries,
      recentLogs: logs.slice(0, 25),
      topupLogs: topups.slice(0, 25),
      providerQuotas: {
        openrouter: {
          configured: !!db.keys?.openrouterApiKey?.trim(),
          balanceUSD: openrouterBalanceUSD,
        },
        openai: {
          configured: !!db.keys?.openaiApiKey?.trim(),
        },
        claude: {
          configured: !!db.keys?.claudeApiKey?.trim(),
        },
        gemini: {
          configured: !!db.keys?.geminiApiKey?.trim(),
        },
        okmd: {
          configured: !!db.keys?.okmdApiKey?.trim(),
          liveQuota: okmdLiveQuota,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch admin stats' }, { status: 500 });
  }
}

// POST endpoint for Admin Credit Adjustment / Manual Topup
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId, amount } = body;
    const db = getDb();

    if (action === 'adjust_credits') {
      const userIndex = db.users.findIndex((u) => u.id === userId || u.username === userId);
      if (userIndex === -1) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const currentBalance = db.users[userIndex].creditsBalance ?? 100.0;
      const newBalance = Math.max(0, parseFloat((currentBalance + Number(amount)).toFixed(4)));
      db.users[userIndex].creditsBalance = newBalance;

      saveDb(db);
      return NextResponse.json({ success: true, newBalance });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
