import { supabase } from "../supabase";

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

// ── Pure helpers (exported for unit tests) ────────────────────────────────────

/**
 * Computes the current consecutive-day streak from an array of distinct
 * YYYY-MM-DD date strings.
 *
 * Rules:
 * - If today has a session, the streak starts from today.
 * - If today has NO session but yesterday does, the streak starts from yesterday
 *   (the user may not have logged yet today).
 * - Any other gap resets the streak to 0.
 *
 * @param dates  Array of YYYY-MM-DD strings (order doesn't matter; may include
 *               dates outside the streak window).
 * @param today  YYYY-MM-DD string representing "today" — injectable for tests.
 */
export function computeStreak(dates: string[], today: string = localDate(new Date())): number {
  if (dates.length === 0) return 0;

  const dateSet  = new Set(dates);
  const todayMs  = new Date(today + "T00:00:00").getTime();
  let   streak   = 0;
  let   cursorMs = todayMs;

  while (true) {
    const d = localDate(new Date(cursorMs));

    if (!dateSet.has(d)) {
      // Allow one skip for today — the user may not have studied yet today
      if (d === today && streak === 0) {
        cursorMs -= 86_400_000;
        continue;
      }
      break;
    }

    streak++;
    cursorMs -= 86_400_000;
  }

  return streak;
}

/** @internal */
export function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
