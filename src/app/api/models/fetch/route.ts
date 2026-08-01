import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { provider } = await req.json();
    const db = getDb();
    const keys = db.keys;

    let fetchedModels: { id: string; name: string; provider: string }[] = [];

    if (provider === 'gemini') {
      const apiKey = keys.geminiApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: 'ยังไม่ได้ระบุ Gemini API Key' }, { status: 400 });
      }
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      if (!res.ok) {
        throw new Error(`Gemini API Error: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.models && Array.isArray(data.models)) {
        fetchedModels = data.models
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => {
            const rawId = m.name.replace('models/', '');
            return {
              id: rawId,
              name: m.displayName || rawId,
              provider: 'gemini',
            };
          });
      }
    } else if (provider === 'openai') {
      const apiKey = keys.openaiApiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: 'ยังไม่ได้ระบุ OpenAI API Key' }, { status: 400 });
      }
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        throw new Error(`OpenAI API Error: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.data && Array.isArray(data.data)) {
        fetchedModels = data.data
          .filter((m: any) => m.id.startsWith('gpt') || m.id.startsWith('o1') || m.id.startsWith('o3'))
          .map((m: any) => ({
            id: m.id,
            name: m.id,
            provider: 'openai',
          }));
      }
    } else if (provider === 'openrouter') {
      const apiKey = keys.openrouterApiKey || process.env.OPENROUTER_API_KEY;
      const headers: Record<string, string> = {};
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

      const res = await fetch('https://openrouter.ai/api/v1/models', { headers });
      if (!res.ok) {
        throw new Error(`OpenRouter API Error: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.data && Array.isArray(data.data)) {
        // Fetch ALL models without truncation limit
        fetchedModels = data.data.map((m: any) => ({
          id: m.id,
          name: m.name || m.id,
          provider: 'openrouter',
        }));
      }
    } else if (provider === 'okmd') {
      const apiKey = keys.okmdApiKey;
      if (!apiKey) {
        return NextResponse.json({ error: 'ยังไม่ได้ระบุ OKMD API Key' }, { status: 400 });
      }
      const baseUrl = keys.okmdBaseUrl
        ? keys.okmdBaseUrl.replace(/\/$/, '')
        : 'https://gen.ai.kku.ac.th/okmd/api/v1';

      const res = await fetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.data || [];
        fetchedModels = list.map((m: any) => ({
          id: String(m.id || m.name),
          name: m.owned_by || m.name || `OKMD Model ${m.id}`,
          provider: 'okmd',
        }));
      } else {
        // Try fallback endpoint /chat/models-list
        const res2 = await fetch(`${baseUrl}/chat/models-list`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res2.ok) {
          const data2 = await res2.json();
          const list2 = Array.isArray(data2) ? data2 : data2.data || [];
          fetchedModels = list2.map((m: any) => ({
            id: String(m.id || m.name),
            name: m.name || `OKMD Model ${m.id}`,
            provider: 'okmd',
          }));
        } else {
          throw new Error(`OKMD API Error: ${res.statusText}`);
        }
      }
    } else if (provider === 'claude') {
      fetchedModels = [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'claude' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'claude' },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'claude' },
      ];
    }

    return NextResponse.json({ success: true, models: fetchedModels });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
