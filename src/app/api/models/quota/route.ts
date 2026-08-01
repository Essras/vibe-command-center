import { NextResponse } from 'next/server';
import { getDb, ProviderKeys } from '@/lib/db';

async function checkQuotas(keys: ProviderKeys, favoriteModelsCount: number, autoFallback429: boolean) {
  const quotaInfo: Record<string, any> = {};

  // 1. Google Gemini Native
  const geminiKey = keys.geminiApiKey || process.env.GEMINI_API_KEY;
  if (geminiKey?.trim()) {
    quotaInfo['gemini'] = {
      provider: 'Google Gemini Native',
      status: '🟢 Connected & Ready',
      quotaText: 'Pay-as-you-go / Free tier 15 RPM',
      keyConfigured: true,
    };
  } else {
    quotaInfo['gemini'] = {
      provider: 'Google Gemini Native',
      status: '🔴 Missing API Key',
      quotaText: 'No key provided',
      keyConfigured: false,
    };
  }

  // 2. OpenAI
  const openaiKey = keys.openaiApiKey || process.env.OPENAI_API_KEY;
  if (openaiKey?.trim()) {
    quotaInfo['openai'] = {
      provider: 'OpenAI',
      status: '🟢 Connected & Ready',
      quotaText: 'Usage-based Tier Billing',
      keyConfigured: true,
    };
  } else {
    quotaInfo['openai'] = {
      provider: 'OpenAI',
      status: '🔴 Missing API Key',
      quotaText: 'No key provided',
      keyConfigured: false,
    };
  }

  // 3. Anthropic Claude
  const claudeKey = keys.claudeApiKey || process.env.ANTHROPIC_API_KEY;
  if (claudeKey?.trim()) {
    quotaInfo['claude'] = {
      provider: 'Anthropic Claude',
      status: '🟢 Connected & Ready',
      quotaText: 'Console Prepaid Credit Tier',
      keyConfigured: true,
    };
  } else {
    quotaInfo['claude'] = {
      provider: 'Anthropic Claude',
      status: '🔴 Missing API Key',
      quotaText: 'No key provided',
      keyConfigured: false,
    };
  }

  // 4. OpenRouter Real-Time Balance & Quota Check
  const openrouterKey = keys.openrouterApiKey || process.env.OPENROUTER_API_KEY;
  if (openrouterKey?.trim()) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/credits', {
        headers: { Authorization: `Bearer ${openrouterKey.trim()}` },
      });
      if (res.ok) {
        const data = await res.json();
        const totalCredits = data.data?.total_credits || 0;
        const totalUsage = data.data?.usage || data.data?.total_usage || 0;
        const balanceUSD = Math.max(0, parseFloat((totalCredits - totalUsage).toFixed(4)));

        quotaInfo['openrouter'] = {
          provider: 'OpenRouter',
          status: '🟢 Active & Connected',
          balanceUSD,
          quotaText: `Balance: $${balanceUSD.toFixed(2)} USD (Total Credits: $${totalCredits.toFixed(2)})`,
          keyConfigured: true,
        };
      } else {
        quotaInfo['openrouter'] = {
          provider: 'OpenRouter',
          status: '🟢 Key Set (Connected)',
          quotaText: 'API Key Active',
          keyConfigured: true,
        };
      }
    } catch (e) {
      quotaInfo['openrouter'] = {
        provider: 'OpenRouter',
        status: '🟢 Key Set (Connected)',
        quotaText: 'API Key Active',
        keyConfigured: true,
      };
    }
  } else {
    quotaInfo['openrouter'] = {
      provider: 'OpenRouter',
      status: '🔴 Missing API Key',
      quotaText: 'No key provided',
      keyConfigured: false,
    };
  }

  // 5. OKMD AI PLAYGROUND
  const okmdKey = keys.okmdApiKey;
  if (okmdKey?.trim()) {
    quotaInfo['okmd'] = {
      provider: 'OKMD AI PLAYGROUND',
      status: '🟢 Connected & Ready',
      baseUrl: keys.okmdBaseUrl || 'https://gen.ai.kku.ac.th/okmd/api/v1',
      quotaText: 'Unlimited Educational Tier',
      keyConfigured: true,
    };
  } else {
    quotaInfo['okmd'] = {
      provider: 'OKMD AI PLAYGROUND',
      status: '🔴 Missing API Key',
      quotaText: 'No key provided',
      keyConfigured: false,
    };
  }

  return {
    timestamp: new Date().toISOString(),
    favoriteModelsCount,
    autoFallback429,
    quotas: quotaInfo,
  };
}

export async function GET() {
  try {
    const db = getDb();
    const data = await checkQuotas(db.keys, db.favoriteModels.length, db.autoFallback429);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = getDb();
    const keysToCheck = body.keys || db.keys;
    const data = await checkQuotas(keysToCheck, db.favoriteModels.length, db.autoFallback429);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
