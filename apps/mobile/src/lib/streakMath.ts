/**
 * @module lib/streakMath
 * Pure helpers for computing consecutive focus-session streaks.
 * No React Native, Supabase, or platform imports — safe to unit-test directly.
 */

/**
 * Computes the current consecutive-day streak from an array of distinct
 * YYYY-MM-DD date strings (in device local time).
 *
 * Rules:
 * - If today has a session, the streak starts from today.
 * - If today has NO session but yesterday does, the streak counts from
 *   yesterday (the user may not have logged yet today).
 * - Any other gap resets the streak to 0.
 *
 * @param dates  Array of YYYY-MM-DD strings (order doesn't matter).
 * @param today  YYYY-MM-DD string for "today" — injectable for tests.
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

/** Returns YYYY-MM-DD in device local timezone. */
export function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
