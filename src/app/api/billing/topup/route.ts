// Payment Gateway Webhook API Route for Topup
// Path: /app/api/billing/topup/route.ts

import { NextResponse } from 'next/server';
import { processUserTopup } from '@/lib/ai/metering';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, amount, creditsAdded, paymentGateway, transactionId } = body;

    if (!userId || !amount || !creditsAdded || !transactionId) {
      return NextResponse.json(
        { error: 'Missing required parameters (userId, amount, creditsAdded, transactionId)' },
        { status: 400 }
      );
    }

    const gatewayName = paymentGateway || 'PromptPay';

    const result = await processUserTopup({
      userId,
      amount: Number(amount),
      creditsAdded: Number(creditsAdded),
      paymentGateway: gatewayName,
      transactionId: String(transactionId),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully credited ${creditsAdded} credits to user account.`,
      newBalance: result.newBalance,
      transactionId: result.topupLog.transactionId,
    });
  } catch (err: any) {
    console.error('Error processing topup webhook:', err);
    return NextResponse.json({ error: err.message || 'Failed to process topup' }, { status: 500 });
  }
}
