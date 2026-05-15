/**
 * @module hooks/useStreak
 * Returns the user's current consecutive focus-session streak in days.
 * Uses the lightweight get_streak_days RPC (bounded to last 90 days)
 * to avoid the full aggregation in get_profile_stats on every mount.
 */

import { useCallback, useEffect, useState } from "react";
import { getStreakDays } from "../lib/api/profile";

export function useStreak() {
  const [streakDays, setStreakDays] = useState(0);
  const [loading, setLoading]      = useState(true);

  const load = useCallback(async () => {
    try {
      const days = await getStreakDays();
      setStreakDays(days);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { streakDays, loading, reload: load };
}
