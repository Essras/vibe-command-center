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

export async function callAIProvider(
  model: FavoriteModel,
  messages: ChatPayload['messages'],
  systemPrompt: string | undefined,
  keys: ProviderKeys
): Promise<Response> {
  const provider = model.provider;
  const modelId = model.id;

  if (provider === 'gemini') {
    const apiKey = keys.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Missing Gemini API Key');
    
    // Map standard messages to Gemini contents format
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
    let apiKey = '';
    let baseUrl = '';

    if (provider === 'openai') {
      apiKey = keys.openaiApiKey || process.env.OPENAI_API_KEY || '';
      baseUrl = 'https://api.openai.com/v1/chat/completions';
    } else if (provider === 'openrouter') {
      apiKey = keys.openrouterApiKey || process.env.OPENROUTER_API_KEY || '';
      baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    } else if (provider === 'okmd') {
      apiKey = keys.okmdApiKey || '';
      baseUrl = keys.okmdBaseUrl
        ? `${keys.okmdBaseUrl.replace(/\/$/, '')}/chat/completions`
        : 'https://api.okmd.ai/v1/chat/completions';
    }

    if (!apiKey) throw new Error(`Missing ${provider.toUpperCase()} API Key`);

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
    const apiKey = keys.claudeApiKey || process.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) throw new Error('Missing Anthropic Claude API Key');

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

  // Build candidate model sequence
  const initialModel = favoriteModels.find((m) => m.id === modelId) || {
    id: modelId,
    name: modelId,
    provider: modelId.includes('claude') ? 'claude' : modelId.includes('gpt') ? 'openai' : 'gemini',
  };

  const modelQueue: FavoriteModel[] = [initialModel];
  if (autoFallback429) {
    favoriteModels.forEach((m) => {
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
        fallbackNotice: `\n\n> 🔄 **Notice:** ติด Rate Limit (429) บนโมเดลเดิม สลับไปใช้โมเดลโปรด **${currentModel.name}**ให้อัตโนมัติ...\n\n`,
        modelUsed: currentModel.name,
      });
    }

    try {
      const res = await callAIProvider(currentModel, messages, systemPrompt, keys);

      if (res.status === 429 && autoFallback429 && i < modelQueue.length - 1) {
        console.warn(`Model ${currentModel.id} returned 429 Rate Limit. Attempting auto-fallback to next model...`);
        lastError = `429 Rate limit on ${currentModel.name}`;
        continue; // Fallback to next model in loop!
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

        // SSE line processing
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
      break; // Successfully finished
    } catch (err: any) {
      lastError = err.message || String(err);
      console.error(`Error with model ${currentModel.id}:`, err);
      if (i === modelQueue.length - 1) {
        onChunk({ error: `เกิดข้อผิดพลาดในการเรียกใช้ AI: ${lastError}` });
      }
    }
  }

  onChunk({ done: true });
}
