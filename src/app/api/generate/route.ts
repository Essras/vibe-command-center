// Main Prompt API integrating Auth Check + Router + Metering
// Path: /app/api/generate/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { verifyTenantProjectAccess } from '@/lib/auth/tenant';
import { routeModel } from '@/lib/ai/router';
import { checkUserCredits, deductCreditsAndLog } from '@/lib/ai/metering';
import { executeAIRequestWithFallback } from '@/lib/ai-engine';
import { getDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('vibe_session')?.value;
    
    // Extract authenticated user username/id
    let userId = 'user-admin'; // Default fallback
    if (token) {
      const verified = await verifyToken(token);
      if (verified?.username) {
        userId = verified.username;
      }
    }

    const body = await req.json();
    const { prompt, projectId, userOverrideModel, attachments = [], messages = [] } = body;

    const finalPrompt = prompt || (messages.length > 0 ? messages[messages.length - 1].content : '');

    if (!finalPrompt) {
      return NextResponse.json({ error: 'Prompt content is required.' }, { status: 400 });
    }

    const targetProjectId = projectId || 'default-workspace';

    // 1. Multi-Tenant Authorization Check
    const tenantCheck = await verifyTenantProjectAccess({ userId, projectId: targetProjectId });
    if (!tenantCheck.authorized) {
      return NextResponse.json({ error: tenantCheck.error || 'Access denied to project.' }, { status: 403 });
    }

    // 2. Pre-execution Credit Check (Minimum 1 Credit Threshold)
    const creditCheck = await checkUserCredits(userId, 1.0);
    if (!creditCheck.allowed) {
      return NextResponse.json(
        {
          error: creditCheck.reason || 'Insufficient credit balance.',
          status: 402,
          currentBalance: creditCheck.balance,
          minThreshold: 1.0,
        },
        { status: 402 } // Payment Required
      );
    }

    // 3. Smart Model Router (Automated Intent Routing, No openrouter/auto)
    const routeInfo = routeModel({
      prompt: finalPrompt,
      userOverrideModel,
      attachments,
      hasImage: attachments.some((att: any) => att.type?.startsWith('image/')),
    });

    const selectedModelId = routeInfo.selectedModelId;
    const db = getDb();
    const project = db.projects.find((p) => p.id === targetProjectId);
    
    // Auto-inject Web & Media Asset Management Guidelines into System Prompt
    const baseSystemPrompt = project ? project.systemPrompt : 'You are an expert Vibe Coding assistant and Content Strategist.';
    const webMediaInstructions = `\n\n[SYSTEM GUIDELINES: WEB BUILDING & MEDIA ASSET MANAGEMENT]
1. When generating websites or online courses: Structure files cleanly in the project directory (e.g. index.html, styles.css, /images, /videos).
2. For website images, reference relative paths like './images/hero-banner.png' or './images/card-1.png'.
3. For YouTube video embeds in online courses or websites (Supports 2 Levels):
   - LEVEL 1 (Clean iframe embed):
     https://www.youtube.com/embed/VIDEO_ID?rel=0&modestbranding=1&controls=1&cc_load_policy=1&cc_lang_pref=th&hl=th
   - LEVEL 2 (Premium Custom Video Player Overlay via Plyr.js - Hides YouTube UI 100%):
     Include Plyr.js CDN (https://cdn.plyr.io/3.7.8/plyr.css and plyr.js) to wrap YouTube video with custom Dark Mode player UI, auto-enabled Thai CC captions, custom speed controls (0.5x - 2x), and zero YouTube branding redirect buttons!
4. Always explain to the user in friendly Thai how to preview their site or download their project.`;

    const systemPrompt = baseSystemPrompt + webMediaInstructions;

    const formattedMessages = messages.length > 0
      ? messages
      : [{ role: 'user', content: finalPrompt }];

    // Prepare streaming response encoder
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let fullText = '';
        let finalModelUsed = selectedModelId;

        // Perform AI request via engine
        await executeAIRequestWithFallback(
          {
            messages: formattedMessages,
            modelId: selectedModelId,
            systemPrompt,
            keys: db.keys,
            favoriteModels: db.favoriteModels,
            autoFallback429: db.autoFallback429,
          },
          (chunk) => {
            if (chunk.text) fullText += chunk.text;
            if (chunk.modelUsed) finalModelUsed = chunk.modelUsed;

            const payload = JSON.stringify({
              ...chunk,
              routeInfo: {
                category: routeInfo.category,
                reason: routeInfo.reason,
                isAutoRouted: routeInfo.isAutoRouted,
              },
            });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        );

        // 4. Post-execution Metering & Deduction
        // Calculate tokens based on prompt length and generated output
        const estimatedPromptTokens = Math.max(15, Math.ceil(finalPrompt.length / 4));
        const estimatedCompletionTokens = Math.max(10, Math.ceil(fullText.length / 4));

        const meteringResult = await deductCreditsAndLog({
          userId,
          projectId: targetProjectId,
          modelUsed: finalModelUsed,
          promptTokens: estimatedPromptTokens,
          completionTokens: estimatedCompletionTokens,
        });

        // Send final metering payload chunk
        const metaPayload = JSON.stringify({
          done: true,
          metering: {
            promptTokens: estimatedPromptTokens,
            completionTokens: estimatedCompletionTokens,
            creditsDeducted: meteringResult.creditsDeducted,
            newBalance: meteringResult.newBalance,
            costInUSD: meteringResult.costInUSD,
          },
        });
        controller.enqueue(encoder.encode(`data: ${metaPayload}\n\n`));

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('Error in /api/generate:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
