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
    const systemPrompt = project ? project.systemPrompt : undefined;

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
