/**
 * @module api/settings
 * Supabase data access for user preferences stored in the profiles table.
 * All reads and writes are scoped to the authenticated user via RLS.
 */

import { supabase } from "../supabase";

/**
 * User-configurable preferences derived from the profiles row.
 * `daily_budget_minutes` is null when the user has not set a custom value,
 * in which case callers should fall back to DEFAULT_DAILY_BUDGET_MINUTES.
 */
export type UserSettings = {
  /** Custom daily study budget in minutes, or null to use the app default. */
  daily_budget_minutes: number | null;
};

/**
 * Fetches the current user's settings from their profiles row.
 * Returns default-shaped settings (all nulls) if the profile row doesn't exist yet.
 *
 * @throws If the user is not authenticated or the query fails.
 * @returns The user's current settings.
 */
export async function getUserSettings(): Promise<UserSettings> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("daily_budget_minutes")
    .eq("id", user.id)
    .single();

  if (error) {
    // PGRST116 = no rows found; profile may not exist yet for new users
    if (error.code === "PGRST116") {
      return { daily_budget_minutes: null };
    }
    throw new Error(error.message);
  }

  return { daily_budget_minutes: (data as UserSettings).daily_budget_minutes };
}

/**
 * Persists the current user's settings to their profiles row.
 * Uses upsert (insert-or-update) so it is safe even if the profile row
 * does not yet exist — e.g. if the on_auth_user_created trigger was missed
 * or a new signup flow bypasses it.
 *
 * @param settings - Partial settings object; only provided keys are written.
 * @throws If the user is not authenticated or the upsert fails.
 */
export async function updateUserSettings(settings: Partial<UserSettings>): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  // id must be included in the upsert payload so Supabase knows the conflict key
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...settings }, { onConflict: "id" });

  if (error) throw new Error(error.message);
}
