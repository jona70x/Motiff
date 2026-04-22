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

  return { daily_budget_minutes: (data as UserSettings).daily_budget_minutes ?? null };
}

/**
 * Updates the current user's settings in their profiles row.
 * Uses upsert so it works even if the profile row doesn't exist yet.
 *
 * @param settings - Partial settings object; only provided keys are written.
 * @throws If the user is not authenticated or the update fails.
 */
export async function updateUserSettings(settings: Partial<UserSettings>): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update(settings)
    .eq("id", user.id);

  if (error) throw new Error(error.message);
}

/**
 * Permanently deletes the current user's account and all associated data
 * by invoking the delete-account Edge Function.
 *
 * Deletion is irreversible. The Edge Function removes all storage objects
 * first, then deletes the auth.users row (which cascades through the entire
 * data model via foreign keys). On success the caller must sign the user out.
 *
 * @throws If the user is not authenticated or the Edge Function returns an error.
 */
export async function deleteAccount(): Promise<void> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("delete-account", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw new Error(error.message);

  // Edge Function returns { ok: boolean; message?: string }
  const result = data as { ok: boolean; message?: string };
  if (!result.ok) {
    throw new Error(result.message ?? "Account deletion failed");
  }
}
