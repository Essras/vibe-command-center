// Token Metering & Credit Billing Engine
// Path: /lib/ai/metering.ts

import { getDb, saveDb, TokenUsageLogItem, TopupLogItem } from '@/lib/db';
import { ALL_MODELS_LIST } from '@/lib/ai/router';

export const CREDITS_PER_USD = 100; // 1 USD = 100 Credits
export const MIN_CREDIT_THRESHOLD = 1.0; // Minimum credit required to trigger AI generation

export interface PreCheckResult {
  allowed: boolean;
  balance: number;
  reason?: string;
}

export interface MeteringDeductInput {
  userId: string;
  projectId?: string;
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
}

export interface MeteringDeductResult {
  success: boolean;
  creditsDeducted: number;
  newBalance: number;
  costInUSD: number;
  log: TokenUsageLogItem;
}

export interface TopupInput {
  userId: string;
  amount: number;         // Amount paid in fiat/currency (e.g., THB or USD)
  creditsAdded: number;   // Total credits to add
  paymentGateway: 'Stripe' | 'Omise' | 'PromptPay' | string;
  transactionId: string;
}

/**
 * Pre-execution Check
 * Verifies if user has sufficient credits before sending request to AI Provider.
 */
export async function checkUserCredits(
  userId: string,
  minThreshold = MIN_CREDIT_THRESHOLD
): Promise<PreCheckResult> {
  const db = getDb();
  const user = db.users.find((u) => u.id === userId || u.username === userId);

  if (!user) {
    // If no explicit user ID matches, check admin user as default fallback
    const adminUser = db.users.find((u) => u.role === 'admin');
    const balance = adminUser ? adminUser.creditsBalance : 0;
    return {
      allowed: balance >= minThreshold,
      balance,
      reason: balance < minThreshold ? `Credit balance (${balance.toFixed(2)}) is below minimum threshold (${minThreshold} Credit).` : undefined,
    };
  }

  const balance = user.creditsBalance ?? 100.0;
  if (balance < minThreshold) {
    return {
      allowed: false,
      balance,
      reason: `Insufficient credit balance (${balance.toFixed(2)} Credits). Minimum ${minThreshold} Credit required to run model.`,
    };
  }

  return {
    allowed: true,
    balance,
  };
}

/**
 * Calculates Token Costs & Deducts Credits
 * Performs atomic credit deduction transaction and logs to TokenUsageLog.
 */
export async function deductCreditsAndLog({
  userId,
  projectId,
  modelUsed,
  promptTokens,
  completionTokens,
}: MeteringDeductInput): Promise<MeteringDeductResult> {
  const db = getDb();

  // Find model pricing definition or fallback to default pricing
  const matchedModel = ALL_MODELS_LIST.find((m) => m.id === modelUsed);
  const promptPricePer1M = matchedModel ? matchedModel.pricing.promptTokenPricePer1M : 1.50;
  const completionPricePer1M = matchedModel ? matchedModel.pricing.completionTokenPricePer1M : 6.00;

  // Calculate actual cost in USD
  const promptCostUSD = (promptTokens * promptPricePer1M) / 1_000_000;
  const completionCostUSD = (completionTokens * completionPricePer1M) / 1_000_000;
  const costInUSD = promptCostUSD + completionCostUSD;

  // Convert USD cost to Credits using Multiplier (1 USD = 100 Credits)
  // Ensure minimum fee of 0.01 credit per call
  const rawCredits = costInUSD * CREDITS_PER_USD;
  const creditsDeducted = Math.max(0.01, parseFloat(rawCredits.toFixed(4)));

  // Atomic Database Credit Deduction
  let userIndex = db.users.findIndex((u) => u.id === userId || u.username === userId);
  if (userIndex === -1) {
    // Fallback to admin user if specific user not found
    userIndex = db.users.findIndex((u) => u.role === 'admin');
  }

  let newBalance = 0;
  if (userIndex !== -1) {
    const currentBalance = db.users[userIndex].creditsBalance ?? 100.0;
    newBalance = Math.max(0, parseFloat((currentBalance - creditsDeducted).toFixed(4)));
    db.users[userIndex].creditsBalance = newBalance;
  }

  // Record TokenUsageLog
  const log: TokenUsageLogItem = {
    id: 'tokenlog-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    userId: userIndex !== -1 ? db.users[userIndex].id : userId,
    projectId,
    modelUsed,
    promptTokens,
    completionTokens,
    creditsDeducted,
    timestamp: new Date().toISOString(),
  };

  db.tokenUsageLogs.unshift(log);
  saveDb(db);

  return {
    success: true,
    creditsDeducted,
    newBalance,
    costInUSD: parseFloat(costInUSD.toFixed(6)),
    log,
  };
}

/**
 * Top-up System Processing
 * Adds credits to user balance atomically and records TopupLog.
 */
export async function processUserTopup({
  userId,
  amount,
  creditsAdded,
  paymentGateway,
  transactionId,
}: TopupInput): Promise<{ success: boolean; newBalance: number; topupLog: TopupLogItem }> {
  const db = getDb();

  let userIndex = db.users.findIndex((u) => u.id === userId || u.username === userId);
  if (userIndex === -1) {
    userIndex = db.users.findIndex((u) => u.role === 'admin');
  }

  if (userIndex === -1) {
    throw new Error(`User ${userId} not found for topup.`);
  }

  // Prevent duplicate transaction processing
  const existingTx = db.topupLogs.find((t) => t.transactionId === transactionId);
  if (existingTx) {
    return {
      success: true,
      newBalance: db.users[userIndex].creditsBalance,
      topupLog: existingTx,
    };
  }

  const currentBalance = db.users[userIndex].creditsBalance ?? 0;
  const newBalance = parseFloat((currentBalance + creditsAdded).toFixed(4));
  db.users[userIndex].creditsBalance = newBalance;

  const topupLog: TopupLogItem = {
    id: 'topup-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    userId: db.users[userIndex].id,
    amount,
    creditsAdded,
    paymentGateway,
    transactionId,
    status: 'SUCCESS',
    createdAt: new Date().toISOString(),
  };

  db.topupLogs.unshift(topupLog);
  saveDb(db);

  return {
    success: true,
    newBalance,
    topupLog,
  };
}
