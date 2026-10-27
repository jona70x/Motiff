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
 * The cursor walks back one calendar day at a time (local midnight minus
 * one day), so streaks that cross a daylight-saving boundary are counted
 * correctly — subtracting a fixed 24h in milliseconds would drift across
 * a DST transition.
 *
 * @param dates  Array of YYYY-MM-DD strings (order doesn't matter).
 * @param today  YYYY-MM-DD string for "today" — injectable for tests.
 */
export function computeStreak(dates: string[], today: string = localDate(new Date())): number {
  if (dates.length === 0) return 0;

  const dateSet = new Set(dates);
  let   streak  = 0;
  let   cursor  = parseLocalDate(today);

  while (true) {
    const d = localDate(cursor);

    if (!dateSet.has(d)) {
      // Allow one skip for today — the user may not have studied yet today
      if (d === today && streak === 0) {
        cursor = previousLocalDay(cursor);
        continue;
      }
      break;
    }

    streak++;
    cursor = previousLocalDay(cursor);
  }

  return streak;
}

/** Returns YYYY-MM-DD in device local timezone. */
export function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parses a YYYY-MM-DD string as a local-midnight Date. */
function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

/** Returns the local-midnight Date for the calendar day before `d`. */
function previousLocalDay(d: Date): Date {
  const prev = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  prev.setDate(prev.getDate() - 1);
  return prev;
}
