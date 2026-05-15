/**
 * @module hooks/useLifetimeStats
 * Fetches all-time focus minutes and completed assignment count via the
 * get_profile_stats RPC. Returns totalMinutes and completedCount.
 */

import { useCallback, useEffect, useState } from "react";
import { getProfileStats } from "../lib/api/profile";

export type LifetimeStats = {
  /** SUM(actual_minutes) across all focus_sessions for this user. */
  totalMinutes: number;
  /** COUNT(*) of assignments where completed_at IS NOT NULL. */
  completedCount: number;
};

export function useLifetimeStats() {
  const [stats, setStats]   = useState<LifetimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await getProfileStats();
      setStats({ totalMinutes: s.totalFocusMinutes, completedCount: s.totalCompleted });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { stats, loading, error, reload: load };
}
