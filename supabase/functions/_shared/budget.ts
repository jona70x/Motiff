import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface UsageIncrement {
  tokensIn: number;
  tokensOut: number;
  usdEstimate: number;
}

export interface BudgetCheckResult {
  allowed: boolean;
  currentMonthUsd: number;
  capUsd: number;
}

/** Returns the first day of the current UTC month as a YYYY-MM-DD string. */
export function currentMonthKey(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/**
 * Check whether the user is under their monthly cap.
 * Uses the service-role client so RLS does not block the Edge Function.
 */
export async function checkBudget(
  client: SupabaseClient,
  userId: string,
  capUsd: number
): Promise<BudgetCheckResult> {
  const month = currentMonthKey();
  const { data, error } = await client
    .from("llm_usage")
    .select("usd_estimate")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();

  if (error) throw new Error(`Budget check failed: ${error.message}`);

  const currentMonthUsd = data?.usd_estimate ?? 0;
  return {
    allowed: currentMonthUsd < capUsd,
    currentMonthUsd,
    capUsd,
  };
}

/**
 * Increment the usage row for the current month.
 * Creates the row if it does not exist (upsert).
 */
export async function incrementUsage(
  client: SupabaseClient,
  userId: string,
  increment: UsageIncrement
): Promise<void> {
  const month = currentMonthKey();

  // Fetch existing row first so we can add to it (Postgres upsert with arithmetic)
  const { data: existing } = await client
    .from("llm_usage")
    .select("tokens_in, tokens_out, usd_estimate")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();

  const newRow = {
    user_id: userId,
    month,
    tokens_in:    (existing?.tokens_in    ?? 0) + increment.tokensIn,
    tokens_out:   (existing?.tokens_out   ?? 0) + increment.tokensOut,
    usd_estimate: (existing?.usd_estimate ?? 0) + increment.usdEstimate,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client
    .from("llm_usage")
    .upsert(newRow, { onConflict: "user_id,month" });

  if (error) throw new Error(`Usage increment failed: ${error.message}`);
}
