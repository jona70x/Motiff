import { supabase } from "../supabase";

export type ProfileStats = {
  /** Consecutive days ending today with at least one focus session. */
  streakDays: number;
  /** Total focus time across all sessions, in minutes. */
  totalFocusMinutes: number;
  /** All-time count of completed assignments. */
  totalCompleted: number;
};

/**
 * Fetches lifetime profile stats for the authenticated user.
 * All queries run against RLS — no service-role key needed.
 */
export async function getProfileStats(): Promise<ProfileStats> {
  const [focusResult, completionResult, streakResult] = await Promise.all([
    // Total focus minutes (all time)
    supabase
      .from("focus_sessions")
      .select("duration_s"),

    // Total completed assignments (all time)
    supabase
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .not("completed_at", "is", null),

    // Distinct dates of focus sessions, most recent first, for streak calc
    supabase
      .from("focus_sessions")
      .select("started_at")
      .order("started_at", { ascending: false }),
  ]);

  // Total focus minutes
  const totalFocusMinutes = Math.round(
    ((focusResult.data ?? []) as { duration_s: number }[]).reduce(
      (sum, s) => sum + (s.duration_s ?? 0),
      0
    ) / 60
  );

  // Total completed
  const totalCompleted = completionResult.count ?? 0;

  // Streak: consecutive days with sessions, going back from today
  const streakDays = computeStreak(
    ((streakResult.data ?? []) as { started_at: string }[]).map((s) => s.started_at)
  );

  return { streakDays, totalFocusMinutes, totalCompleted };
}

function computeStreak(sessionTimestamps: string[]): number {
  if (sessionTimestamps.length === 0) return 0;

  // Collect unique YYYY-MM-DD dates (local time)
  const dates = new Set<string>();
  for (const ts of sessionTimestamps) {
    dates.add(localDate(new Date(ts)));
  }

  const today = localDate(new Date());
  let streak = 0;
  let cursor = new Date();

  // Walk backwards day by day; stop at first gap
  while (true) {
    const d = localDate(cursor);
    if (!dates.has(d)) {
      // If the first missing day is today, still allow a streak starting yesterday
      if (d === today && streak === 0) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
