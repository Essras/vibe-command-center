// Smart Model Router & Provider Architecture
// Path: /lib/ai/router.ts

export type ModelCategory = 'FAST_MODEL' | 'BALANCED_MODEL' | 'REASONING_MODEL' | 'VISION_MODEL';

export interface ModelPricing {
  promptTokenPricePer1M: number;     // USD per 1M prompt tokens
  completionTokenPricePer1M: number; // USD per 1M completion tokens
}

export interface ModelDefinition {
  id: string;
  name: string;
  category: ModelCategory;
  provider: 'openai' | 'anthropic' | 'deepseek' | 'openrouter';
  description: string;
  pricing: ModelPricing;
}

export const SUPPORTED_MODELS: Record<ModelCategory, ModelDefinition[]> = {
  FAST_MODEL: [
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      category: 'FAST_MODEL',
      provider: 'openai',
      description: 'Ultra-fast model optimized for short text, quick UI/CSS, and formatting tasks.',
      pricing: { promptTokenPricePer1M: 0.15, completionTokenPricePer1M: 0.60 },
    },
    {
      id: 'anthropic/claude-3-5-haiku',
      name: 'Claude 3.5 Haiku',
      category: 'FAST_MODEL',
      provider: 'openrouter',
      description: 'High-speed model for rapid code edits and lightweight queries.',
      pricing: { promptTokenPricePer1M: 0.80, completionTokenPricePer1M: 4.00 },
    },
  ],
  BALANCED_MODEL: [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      category: 'BALANCED_MODEL',
      provider: 'anthropic',
      description: 'State-of-the-art coding and general logic model.',
      pricing: { promptTokenPricePer1M: 3.00, completionTokenPricePer1M: 15.00 },
    },
    {
      id: 'deepseek/deepseek-chat',
      name: 'DeepSeek V3 Chat',
      category: 'BALANCED_MODEL',
      provider: 'openrouter',
      description: 'Cost-effective high performance coding model.',
      pricing: { promptTokenPricePer1M: 0.14, completionTokenPricePer1M: 0.28 },
    },
  ],
  REASONING_MODEL: [
    {
      id: 'deepseek/deepseek-reasoner',
      name: 'DeepSeek R1 Reasoner',
      category: 'REASONING_MODEL',
      provider: 'openrouter',
      description: 'Specialized chain-of-thought model for complex debugging and architecture design.',
      pricing: { promptTokenPricePer1M: 0.55, completionTokenPricePer1M: 2.19 },
    },
    {
      id: 'o3-mini',
      name: 'OpenAI o3-mini',
      category: 'REASONING_MODEL',
      provider: 'openai',
      description: 'High-reasoning model for complex math, algorithms, and deep logic analysis.',
      pricing: { promptTokenPricePer1M: 1.10, completionTokenPricePer1M: 4.40 },
    },
  ],
  VISION_MODEL: [
    {
      id: 'claude-3-5-sonnet',
      name: 'Claude 3.5 Sonnet (Vision)',
      category: 'VISION_MODEL',
      provider: 'anthropic',
      description: 'Multimodal vision model for processing images, UI mockups, and diagrams.',
      pricing: { promptTokenPricePer1M: 3.00, completionTokenPricePer1M: 15.00 },
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o (Vision)',
      category: 'VISION_MODEL',
      provider: 'openai',
      description: 'OpenAI multimodal vision model for image understanding and code generation.',
      pricing: { promptTokenPricePer1M: 2.50, completionTokenPricePer1M: 10.00 },
    },
  ],
};

// Flattened list for quick ID lookup
export const ALL_MODELS_LIST: ModelDefinition[] = Object.values(SUPPORTED_MODELS).flat();

export interface RouteInput {
  prompt: string;
  userOverrideModel?: string; // If specified, overrides auto routing
  attachments?: Array<{ type: string; url?: string; name?: string; content?: string }>;
  hasImage?: boolean;
}

export interface RouteResult {
  selectedModelId: string;
  category: ModelCategory;
  isAutoRouted: boolean;
  reason: string;
  model: ModelDefinition;
}

/**
  * Smart Model Router Engine
  * Selects exact Model ID based on user override or intent classification.
  * Ensures openrouter/auto is NEVER used.
  */
export function routeModel({ prompt, userOverrideModel, attachments = [], hasImage = false }: RouteInput): RouteResult {
  // 1. Manual User Override Check
  if (userOverrideModel && userOverrideModel.toLowerCase() !== 'auto' && userOverrideModel.toLowerCase() !== 'openrouter/auto') {
    const matchedModel = ALL_MODELS_LIST.find((m) => m.id === userOverrideModel);
    if (matchedModel) {
      return {
        selectedModelId: matchedModel.id,
        category: matchedModel.category,
        isAutoRouted: false,
        reason: `User explicitly requested model: ${matchedModel.name}`,
        model: matchedModel,
      };
    }

    // Fallback if custom explicit model ID is passed directly
    return {
      selectedModelId: userOverrideModel,
      category: 'BALANCED_MODEL',
      isAutoRouted: false,
      reason: `User override model: ${userOverrideModel}`,
      model: {
        id: userOverrideModel,
        name: userOverrideModel,
        category: 'BALANCED_MODEL',
        provider: userOverrideModel.includes('/') ? 'openrouter' : 'openai',
        description: 'User specified custom model',
        pricing: { promptTokenPricePer1M: 2.00, completionTokenPricePer1M: 8.00 },
      },
    };
  }

  // 2. Auto Routing Logic
  // Check for Image Attachment Payload
  const imageAttachmentExists = hasImage || attachments.some((att) =>
    att.type?.startsWith('image/') ||
    att.name?.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i) ||
    att.content?.startsWith('data:image/')
  );

  if (imageAttachmentExists) {
    const model = SUPPORTED_MODELS.VISION_MODEL[0]; // Primary Vision Model: claude-3-5-sonnet
    return {
      selectedModelId: model.id,
      category: 'VISION_MODEL',
      isAutoRouted: true,
      reason: 'Detected image payload. Auto-routed to Vision Model.',
      model,
    };
  }

  const promptLower = prompt.toLowerCase();

  // 3. Reasoning / Architecture / Debug Hard Bugs Intent Keywords
  const reasoningKeywords = [
    'debug', 'fix bug', 'architecture', 'refactor system', 'memory leak',
    'race condition', 'algorithm', 'complex', 'reason', 'math', 'proof',
    'แก้บั๊กยาก', 'ออกแบบโครงสร้าง', 'วิเคราะห์สถาปัตยกรรม', 'บั๊ก', 'วิเคราะห์'
  ];
  const isReasoningIntent = reasoningKeywords.some((kw) => promptLower.includes(kw));

  if (isReasoningIntent) {
    const model = SUPPORTED_MODELS.REASONING_MODEL[0]; // Primary Reasoning Model: deepseek/deepseek-reasoner
    return {
      selectedModelId: model.id,
      category: 'REASONING_MODEL',
      isAutoRouted: true,
      reason: 'Detected complex debugging or architectural reasoning intent. Auto-routed to Reasoning Model.',
      model,
    };
  }

  // 4. Short UI / CSS / Text Intent Keywords or Short Prompts
  const fastKeywords = ['css', 'style', 'html', 'typo', 'ui', 'color', 'formatting', 'แต่งสี', 'จัดทรง', 'แปลภาษา'];
  const isFastIntent = (prompt.length < 120 && fastKeywords.some((kw) => promptLower.includes(kw))) || prompt.length < 60;

  if (isFastIntent) {
    const model = SUPPORTED_MODELS.FAST_MODEL[0]; // Primary Fast Model: gpt-4o-mini
    return {
      selectedModelId: model.id,
      category: 'FAST_MODEL',
      isAutoRouted: true,
      reason: 'Detected short prompt or lightweight UI/formatting task. Auto-routed to Fast Model.',
      model,
    };
  }

  // 5. Default General Coding & Main Logic (Balanced)
  const defaultModel = SUPPORTED_MODELS.BALANCED_MODEL[0]; // Primary Balanced Model: claude-3-5-sonnet-20241022
  return {
    selectedModelId: defaultModel.id,
    category: 'BALANCED_MODEL',
    isAutoRouted: true,
    reason: 'Standard coding / main logic prompt. Auto-routed to Balanced Model.',
    model: defaultModel,
  };
}
