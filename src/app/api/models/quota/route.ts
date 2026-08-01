import { NextResponse } from 'next/server';
import { getDb, ProviderKeys } from '@/lib/db';

async function checkQuotas(keys: ProviderKeys, favoriteModelsCount: number, autoFallback429: boolean) {
  const quotaInfo: Record<string, any> = {};

  // 1. Gemini
  const geminiKey = keys.geminiApiKey || process.env.GEMINI_API_KEY;
  if (geminiKey?.trim()) {
    quotaInfo['gemini'] = {
      provider: 'Google Gemini Native',
      status: 'Active (Ready)',
      rateLimitPolicy: 'Free: 15 RPM / Paid: Auto-scale',
      keyConfigured: true,
    };
  } else {
    quotaInfo['gemini'] = { provider: 'Google Gemini Native', status: 'Missing Key', keyConfigured: false };
  }

  // 2. OpenAI
  const openaiKey = keys.openaiApiKey || process.env.OPENAI_API_KEY;
  if (openaiKey?.trim()) {
    quotaInfo['openai'] = {
      provider: 'OpenAI',
      status: 'Active (Ready)',
      rateLimitPolicy: 'Standard Tier Quota',
      keyConfigured: true,
    };
  } else {
    quotaInfo['openai'] = { provider: 'OpenAI', status: 'Missing Key', keyConfigured: false };
  }

  // 3. Anthropic Claude
  const claudeKey = keys.claudeApiKey || process.env.ANTHROPIC_API_KEY;
  if (claudeKey?.trim()) {
    quotaInfo['claude'] = {
      provider: 'Anthropic Claude',
      status: 'Active (Ready)',
      keyConfigured: true,
    };
  } else {
    quotaInfo['claude'] = { provider: 'Anthropic Claude', status: 'Missing Key', keyConfigured: false };
  }

  // 4. OpenRouter
  const openrouterKey = keys.openrouterApiKey || process.env.OPENROUTER_API_KEY;
  if (openrouterKey?.trim()) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${openrouterKey.trim()}` },
      });
      if (res.ok) {
        const data = await res.json();
        quotaInfo['openrouter'] = {
          provider: 'OpenRouter',
          status: 'Active (Ready)',
          usage: data.data?.usage || 0,
          limit: data.data?.limit || 'Unlimited',
          keyConfigured: true,
        };
      } else {
        quotaInfo['openrouter'] = { provider: 'OpenRouter', status: 'Active (Key Set)', keyConfigured: true };
      }
    } catch (e) {
      quotaInfo['openrouter'] = { provider: 'OpenRouter', status: 'Active (Key Set)', keyConfigured: true };
    }
  } else {
    quotaInfo['openrouter'] = { provider: 'OpenRouter', status: 'Missing Key', keyConfigured: false };
  }

  // 5. OKMD
  const okmdKey = keys.okmdApiKey;
  if (okmdKey?.trim()) {
    quotaInfo['okmd'] = {
      provider: 'OKMD AI PLAYGROUND',
      status: 'Active (Ready)',
      baseUrl: keys.okmdBaseUrl || 'https://gen.ai.kku.ac.th/okmd/api/v1',
      keyConfigured: true,
    };
  } else {
    quotaInfo['okmd'] = { provider: 'OKMD AI PLAYGROUND', status: 'Missing Key', keyConfigured: false };
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
