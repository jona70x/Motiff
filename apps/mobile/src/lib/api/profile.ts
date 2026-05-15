import { supabase } from "../supabase";
import { computeStreak, localDate } from "../streakMath";

export type ProfileStats = {
  /** Consecutive days ending today with at least one focus session. */
  streakDays: number;
  /** Total focus time across all sessions, in minutes. */
  totalFocusMinutes: number;
  /** All-time count of completed assignments. */
  totalCompleted: number;
};

type RpcResult = {
  total_focus_minutes: number;
  total_completed: number;
  /** YYYY-MM-DD strings ordered DESC, bounded to last 90 days. */
  recent_session_dates: string[];
};

/**
 * Fetches lifetime profile stats via a single Postgres RPC call.
 * Aggregations run server-side — no unbounded row scans over the wire.
 * RLS on focus_sessions and assignments enforces per-user isolation.
 */
export async function getProfileStats(): Promise<ProfileStats> {
  const { data, error } = await supabase.rpc("get_profile_stats");
  if (error) throw new Error(error.message);

  const result = data as RpcResult;

  return {
    totalFocusMinutes: result.total_focus_minutes ?? 0,
    totalCompleted:    result.total_completed    ?? 0,
    streakDays:        computeStreak(result.recent_session_dates ?? [], localDate(new Date())),
  };
}

/**
 * Fetches only the current streak for the TodayScreen badge.
 * Uses the bounded get_streak_days() RPC — avoids the all-time focus_sessions
 * aggregation in get_profile_stats() on every cold start (TD-37).
 */
export async function getStreakDays(): Promise<number> {
  const { data, error } = await supabase.rpc("get_streak_days");
  if (error) throw new Error(error.message);
  const dates = (data as string[]) ?? [];
  return computeStreak(dates, localDate(new Date()));
}

// Pure streak helpers live in lib/streakMath.ts (no platform deps — testable).
// Re-export for any callers that imported directly from this module.
export { computeStreak, localDate } from "../streakMath";
