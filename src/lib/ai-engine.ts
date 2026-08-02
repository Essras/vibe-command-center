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

export function cleanModelId(rawId: string): string {
  if (!rawId) return '';
  return rawId
    .replace(/^\[(FREE|PAID|FREE TIER|FREE QUOTA).*?\]\s*/i, '')
    .replace(/🟢|💳|⚡|⚖️|🧠|👁️/g, '')
    .trim();
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
  const rawModelId = model.id;
  const modelId = cleanModelId(rawModelId);
  const rawApiKey = getProviderApiKey(provider, keys);
  const apiKey = rawApiKey.replace(/^Bearer\s+/i, '').trim();

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
      const okmdBase = keys.okmdBaseUrl
        ? keys.okmdBaseUrl.replace(/\/$/, '')
        : 'https://gen.ai.kku.ac.th/okmd/api/v1';
      baseUrl = `${okmdBase}/chat/completions`;
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

    if (provider === 'okmd') {
      let okmdModel: any = modelId;
      if (!isNaN(Number(modelId)) && modelId.trim() !== '') {
        okmdModel = Number(modelId);
      }

      return fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: okmdModel,
          messages: formattedMessages,
          stream: true,
        }),
      });
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

export function resolveModelCategory(
  modelId: string,
  favoriteModels: FavoriteModel[],
  keys: ProviderKeys
): FavoriteModel {
  // 1. Check exact match first (Directly fetched dynamically from AI Provider APIs)
  const exact = favoriteModels.find((m) => m.id === modelId);
  if (exact) return exact;

  // Filter models that have configured API keys
  const validModels = favoriteModels.filter((m) => {
    if (m.provider === 'gemini') return !!(keys.geminiApiKey?.trim() || process.env.GEMINI_API_KEY);
    if (m.provider === 'openai') return !!(keys.openaiApiKey?.trim() || process.env.OPENAI_API_KEY);
    if (m.provider === 'claude') return !!(keys.claudeApiKey?.trim() || process.env.ANTHROPIC_API_KEY);
    if (m.provider === 'openrouter') return !!(keys.openrouterApiKey?.trim() || process.env.OPENROUTER_API_KEY);
    if (m.provider === 'okmd') return !!(keys.okmdApiKey?.trim());
    return false;
  });

  const available = validModels.length > 0 ? validModels : favoriteModels;

  if (modelId === 'fast') {
    return (
      available.find(
        (m) =>
          !m.name.toLowerCase().includes('opus') &&
          !m.id.toLowerCase().includes('opus') &&
          (m.id.includes('flash') || m.id.includes('mini') || m.id.includes('haiku') || m.id.includes('gemma'))
      ) || available[0]
    );
  }
  if (modelId === 'balanced') {
    return available.find((m) => m.id.includes('sonnet') || m.id.includes('gpt-4o') || m.id.includes('pro') || m.id.includes('deepseek')) || available[0];
  }
  if (modelId === 'reasoning') {
    return available.find((m) => m.id.includes('r1') || m.id.includes('o1') || m.id.includes('o3') || m.id.includes('reasoning') || m.id.includes('thinking')) || available[0];
  }
  if (modelId === 'vision') {
    return available.find((m) => m.id.includes('vision') || m.id.includes('4o') || m.id.includes('gemini')) || available[0];
  }

  // Default "auto": pick first available model with configured key
  return available[0] || favoriteModels[0] || { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini' };
}

export async function executeAIRequestWithFallback(
  payload: ChatPayload,
  onChunk: (chunk: StreamChunk) => void
) {
  const { modelId, messages, systemPrompt, keys, favoriteModels, autoFallback429 } = payload;

  // Resolve category aliases ("auto", "fast", "balanced", "reasoning", "vision") to a real model
  const initialModel = resolveModelCategory(modelId, favoriteModels, keys);

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

  let lastError = '';
  let isRateLimitCascade = false;

  for (let i = 0; i < modelQueue.length; i++) {
    const currentModel = modelQueue[i];

    if (i > 0 && isRateLimitCascade) {
      onChunk({
        fallbackTriggered: true,
        fallbackNotice: `\n\n> 🔄 **Notice:** ติด Rate Limit (429) บนโมเดลเดิม สลับไปใช้โมเดลโปรด **${currentModel.name}** (${currentModel.provider.toUpperCase()}) ให้อัตโนมัติ...\n\n`,
        modelUsed: currentModel.name,
      });
      isRateLimitCascade = false;
    }

    try {
      const res = await callAIProvider(currentModel, messages, systemPrompt, keys);

      // Check if HTTP status is 429 Rate Limit
      if (res.status === 429) {
        console.warn(`Model ${currentModel.id} returned 429 Rate Limit.`);
        lastError = `429 Rate limit on ${currentModel.name}`;
        isRateLimitCascade = true;
        if (autoFallback429 && i < modelQueue.length - 1) {
          continue;
        }
      }

      // Handle Non-200 Errors
      if (!res.ok) {
        const errText = await res.text();
        let parsedErr = errText;
        let is429Err = res.status === 429;

        try {
          const jsonErr = JSON.parse(errText);
          parsedErr = typeof jsonErr.error === 'string' ? jsonErr.error : jsonErr.error?.message || jsonErr.message || errText;
          if (
            res.status === 429 ||
            res.status === 503 ||
            jsonErr.error?.code === 429 ||
            jsonErr.error?.status === 'RESOURCE_EXHAUSTED' ||
            parsedErr.toLowerCase().includes('rate limit') ||
            parsedErr.toLowerCase().includes('quota') ||
            parsedErr.toLowerCase().includes('service is unavailable') ||
            parsedErr.toLowerCase().includes('unavailable')
          ) {
            is429Err = true;
          }
        } catch (e) {}

        if (is429Err && autoFallback429 && i < modelQueue.length - 1) {
          isRateLimitCascade = true;
          lastError = parsedErr;
          continue;
        }

        // If it is NOT a 429 Rate Limit (e.g. 401 Invalid Key, 400 Bad Request, 404 Not Found), stop execution immediately!
        onChunk({
          error: `[${currentModel.provider.toUpperCase()}] ${currentModel.name}: ${parsedErr}`,
          done: true,
        });
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Response body reader not available');

      const decoder = new TextDecoder();
      let buffer = '';
      let streamHasPayload = false;

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
                if (data.error) {
                  throw new Error(data.error.message || 'Gemini API Error');
                }
                const chunkText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (chunkText) {
                  streamHasPayload = true;
                  onChunk({ text: chunkText, modelUsed: currentModel.name });
                }
              } catch (e: any) {
                if (e.message && !e.message.includes('JSON')) {
                  throw e;
                }
              }
            }
          } else if (currentModel.provider === 'claude') {
            if (trimmed.startsWith('data:')) {
              try {
                const data = JSON.parse(trimmed.slice(5).trim());
                if (data.error) {
                  throw new Error(data.error.message || 'Claude API Error');
                }
                if (data.type === 'content_block_delta' && data.delta?.text) {
                  streamHasPayload = true;
                  onChunk({ text: data.delta.text, modelUsed: currentModel.name });
                }
              } catch (e: any) {
                if (e.message && !e.message.includes('JSON')) {
                  throw e;
                }
              }
            }
          } else {
            // OpenAI / OpenRouter / OKMD standard SSE & JSON parser
            try {
              let jsonStr = '';
              if (trimmed.startsWith('data:')) {
                jsonStr = trimmed.slice(5).trim();
              } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                jsonStr = trimmed;
              }

              if (jsonStr && jsonStr !== '[DONE]') {
                const data = JSON.parse(jsonStr);
                if (data.error) {
                  const errMsg = data.error.message || JSON.stringify(data.error);
                  if (errMsg.toLowerCase().includes('rate limit') || data.error.code === 429) {
                    isRateLimitCascade = true;
                    throw new Error(`429: ${errMsg}`);
                  }
                  throw new Error(errMsg);
                }
                const chunkText =
                  data.choices?.[0]?.delta?.content ||
                  data.choices?.[0]?.text ||
                  data.choices?.[0]?.message?.content ||
                  data.content ||
                  data.text ||
                  data.response ||
                  (typeof data.delta === 'string' ? data.delta : undefined);

                if (chunkText) {
                  streamHasPayload = true;
                  onChunk({ text: chunkText, modelUsed: currentModel.name });
                }
              }
            } catch (e: any) {
              if (e.message && !e.message.includes('JSON')) {
                throw e;
              }
            }
          }
        }
      }

      if (!streamHasPayload) {
        onChunk({
          error: `[${currentModel.provider.toUpperCase()}] ${currentModel.name}: ไม่ได้รับข้อความตอบกลับจาก API (Empty Stream Response)`,
          done: true,
        });
        return;
      }

      // Successful completion
      onChunk({ done: true });
      return;
    } catch (err: any) {
      lastError = err.message || String(err);
      console.error(`Error with model ${currentModel.id}:`, err);

      const is429 = lastError.includes('429') || lastError.toLowerCase().includes('rate limit');
      if (is429 && autoFallback429 && i < modelQueue.length - 1) {
        isRateLimitCascade = true;
        continue;
      }

      // Non-429 error or end of queue: stop and show exact error message
      onChunk({
        error: `[${currentModel.provider.toUpperCase()}] ${currentModel.name}: ${lastError}`,
        done: true,
      });
      return;
    }
  }

  onChunk({ error: `โมเดลโปรดทั้งหมดติด Rate Limit (429): ${lastError}`, done: true });
}
