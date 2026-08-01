import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const { keys, favoriteModels } = db;

    const quotaInfo: Record<string, any> = {};

    // Check Gemini API status
    if (keys.geminiApiKey) {
      quotaInfo['gemini'] = {
        provider: 'Google Gemini Native',
        status: 'Active',
        rateLimitPolicy: 'Free tier: 15 RPM / Paid tier: Auto-scale',
        keyConfigured: true,
      };
    } else {
      quotaInfo['gemini'] = { provider: 'Google Gemini Native', status: 'Missing Key', keyConfigured: false };
    }

    // Check OpenAI API status
    if (keys.openaiApiKey) {
      quotaInfo['openai'] = {
        provider: 'OpenAI',
        status: 'Active',
        rateLimitPolicy: 'Standard Tier Quota',
        keyConfigured: true,
      };
    } else {
      quotaInfo['openai'] = { provider: 'OpenAI', status: 'Missing Key', keyConfigured: false };
    }

    // Check Anthropic Claude
    if (keys.claudeApiKey) {
      quotaInfo['claude'] = {
        provider: 'Anthropic Claude',
        status: 'Active',
        keyConfigured: true,
      };
    } else {
      quotaInfo['claude'] = { provider: 'Anthropic Claude', status: 'Missing Key', keyConfigured: false };
    }

    // Check OpenRouter
    if (keys.openrouterApiKey) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { Authorization: `Bearer ${keys.openrouterApiKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          quotaInfo['openrouter'] = {
            provider: 'OpenRouter',
            status: 'Active',
            usage: data.data?.usage || 0,
            limit: data.data?.limit || 'Unlimited',
            keyConfigured: true,
          };
        } else {
          quotaInfo['openrouter'] = { provider: 'OpenRouter', status: 'Invalid Key', keyConfigured: true };
        }
      } catch (e) {
        quotaInfo['openrouter'] = { provider: 'OpenRouter', status: 'Active (Unchecked)', keyConfigured: true };
      }
    } else {
      quotaInfo['openrouter'] = { provider: 'OpenRouter', status: 'Missing Key', keyConfigured: false };
    }

    // Check OKMD
    if (keys.okmdApiKey) {
      quotaInfo['okmd'] = {
        provider: 'OKMD AI PLAYGROUND',
        status: 'Active',
        baseUrl: keys.okmdBaseUrl || 'https://api.okmd.ai/v1',
        keyConfigured: true,
      };
    } else {
      quotaInfo['okmd'] = { provider: 'OKMD AI PLAYGROUND', status: 'Missing Key', keyConfigured: false };
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      favoriteModelsCount: favoriteModels.length,
      autoFallback429: db.autoFallback429,
      quotas: quotaInfo,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
