import { ProviderKeys, FavoriteModel } from './db';

export interface ChatPayload {
  messages: { role: string; content: string; attachments?: any[] }[];
  modelId: string;
  systemPrompt?: string;
  keys: ProviderKeys;
  favoriteModels: FavoriteModel[];
  autoFallback429: boolean;
}

export interface StreamChunk {
  text?: string;
  modelUsed?: string;
  error?: string;
  fallbackTriggered?: boolean;
  fallbackNotice?: string;
  done?: boolean;
}

export function getProviderApiKey(provider: string, keys: ProviderKeys): string {
  if (provider === 'gemini') return keys.geminiApiKey || process.env.GEMINI_API_KEY || '';
  if (provider === 'openai') return keys.openaiApiKey || process.env.OPENAI_API_KEY || '';
  if (provider === 'claude') return keys.claudeApiKey || process.env.ANTHROPIC_API_KEY || '';
  if (provider === 'openrouter') return keys.openrouterApiKey || process.env.OPENROUTER_API_KEY || '';
  if (provider === 'okmd') return keys.okmdApiKey || '';
  return '';
}

export async function callAIProvider(
  model: FavoriteModel,
  messages: ChatPayload['messages'],
  systemPrompt: string | undefined,
  keys: ProviderKeys
): Promise<Response> {
  const provider = model.provider;
  const modelId = model.id;
  const apiKey = getProviderApiKey(provider, keys);

  if (!apiKey) {
    throw new Error(`ยังไม่ได้กรอก API Key สำหรับ Provider: ${provider.toUpperCase()}`);
  }

  if (provider === 'gemini') {
    const contents = messages.map((m) => {
      let text = m.content;
      if (m.attachments && m.attachments.length > 0) {
        const attText = m.attachments
          .map((a: any) => `\n\n[Attached File: ${a.name}]\n${a.content || ''}`)
          .join('');
        text += attText;
      }
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text }],
      };
    });

    const body: any = { contents };
    if (systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${apiKey}`;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } else if (provider === 'openai' || provider === 'openrouter' || provider === 'okmd') {
    let baseUrl = '';

    if (provider === 'openai') {
      baseUrl = 'https://api.openai.com/v1/chat/completions';
    } else if (provider === 'openrouter') {
      baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    } else if (provider === 'okmd') {
      const rawBase = keys.okmdBaseUrl
        ? keys.okmdBaseUrl.replace(/\/$/, '')
        : 'https://gen.ai.kku.ac.th/okmd/api/v1';
      baseUrl = `${rawBase}/chat/completions`;
    }

    const formattedMessages: any[] = [];
    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }
    messages.forEach((m) => {
      let text = m.content;
      if (m.attachments && m.attachments.length > 0) {
        const attText = m.attachments
          .map((a: any) => `\n\n[Attached File: ${a.name}]\n${a.content || ''}`)
          .join('');
        text += attText;
      }
      formattedMessages.push({ role: m.role, content: text });
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://vibe.zodiacpsych.com';
      headers['X-Title'] = 'Vibe Command Center';
    }

    return fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelId,
        messages: formattedMessages,
        stream: true,
      }),
    });
  } else if (provider === 'claude') {
    const formattedMessages = messages.map((m) => {
      let text = m.content;
      if (m.attachments && m.attachments.length > 0) {
        const attText = m.attachments
          .map((a: any) => `\n\n[Attached File: ${a.name}]\n${a.content || ''}`)
          .join('');
        text += attText;
      }
      return { role: m.role === 'assistant' ? 'assistant' : 'user', content: text };
    });

    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 4096,
        system: systemPrompt || undefined,
        messages: formattedMessages,
        stream: true,
      }),
    });
  }

  throw new Error(`Unsupported provider ${provider}`);
}

export async function executeAIRequestWithFallback(
  payload: ChatPayload,
  onChunk: (chunk: StreamChunk) => void
) {
  const { modelId, messages, systemPrompt, keys, favoriteModels, autoFallback429 } = payload;

  // Infer provider safely if model not explicitly in favoriteModels list
  const foundModel = favoriteModels.find((m) => m.id === modelId);
  const initialModel: FavoriteModel = foundModel || {
    id: modelId,
    name: modelId,
    provider: modelId.includes('claude')
      ? 'claude'
      : modelId.includes('gpt') || modelId.startsWith('o1') || modelId.startsWith('o3')
      ? 'openai'
      : modelId.includes('gemini')
      ? 'gemini'
      : 'okmd',
  };

  // Ensure initial model provider has an API Key
  const initialKey = getProviderApiKey(initialModel.provider, keys);
  if (!initialKey) {
    onChunk({
      error: `ไม่สามารถเรียกใช้งานโมเดล "${initialModel.name}" ได้ เนื่องจากยังไม่ได้กรอก API Key สำหรับ ${initialModel.provider.toUpperCase()} ในหน้าตั้งค่า`,
      done: true,
    });
    return;
  }

  // Filter model queue to ONLY include models with valid API keys
  const candidateModels = favoriteModels.filter((m) => {
    const k = getProviderApiKey(m.provider, keys);
    return !!k;
  });

  const modelQueue: FavoriteModel[] = [initialModel];
  if (autoFallback429) {
    candidateModels.forEach((m) => {
      if (m.id !== initialModel.id) {
        modelQueue.push(m);
      }
    });
  }

  let success = false;
  let lastError = '';

  for (let i = 0; i < modelQueue.length; i++) {
    const currentModel = modelQueue[i];
    if (i > 0) {
      onChunk({
        fallbackTriggered: true,
        fallbackNotice: `\n\n> 🔄 **Notice:** ติด Rate Limit (429) บนโมเดลเดิม สลับไปใช้โมเดลโปรด **${currentModel.name}** (${currentModel.provider.toUpperCase()}) ให้อัตโนมัติ...\n\n`,
        modelUsed: currentModel.name,
      });
    }

    try {
      const res = await callAIProvider(currentModel, messages, systemPrompt, keys);

      if (res.status === 429 && autoFallback429 && i < modelQueue.length - 1) {
        console.warn(`Model ${currentModel.id} returned 429 Rate Limit. Attempting auto-fallback...`);
        lastError = `429 Rate limit on ${currentModel.name}`;
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 429 && autoFallback429 && i < modelQueue.length - 1) {
          continue;
        }
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Response body reader not available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (currentModel.provider === 'gemini') {
            if (trimmed.startsWith('data:')) {
              try {
                const data = JSON.parse(trimmed.slice(5).trim());
                const chunkText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (chunkText) {
                  onChunk({ text: chunkText, modelUsed: currentModel.name });
                }
              } catch (e) {}
            }
          } else if (currentModel.provider === 'claude') {
            if (trimmed.startsWith('data:')) {
              try {
                const data = JSON.parse(trimmed.slice(5).trim());
                if (data.type === 'content_block_delta' && data.delta?.text) {
                  onChunk({ text: data.delta.text, modelUsed: currentModel.name });
                }
              } catch (e) {}
            }
          } else {
            // OpenAI / OpenRouter / OKMD standard SSE
            if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.slice(5).trim();
              if (dataStr === '[DONE]') continue;
              try {
                const data = JSON.parse(dataStr);
                const chunkText = data.choices?.[0]?.delta?.content;
                if (chunkText) {
                  onChunk({ text: chunkText, modelUsed: currentModel.name });
                }
              } catch (e) {}
            }
          }
        }
      }

      success = true;
      break;
    } catch (err: any) {
      lastError = err.message || String(err);
      console.error(`Error with model ${currentModel.id}:`, err);
      if (i === modelQueue.length - 1) {
        onChunk({ error: `เกิดข้อผิดพลาดในการเรียกใช้ AI (${currentModel.provider.toUpperCase()}): ${lastError}` });
      }
    }
  }

  onChunk({ done: true });
}
