import { supabase } from "../supabase";
import type { SessionRecord } from "../../../../../packages/domain/progress/summary";

type RawSession = {
  duration_s: number;
  started_at: string;
  assignment: {
    course_id: string;
    course: { id: string; title: string } | null;
  } | null;
};

export async function getWeekSessions(): Promise<SessionRecord[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("focus_sessions")
    .select("duration_s, started_at, assignment:assignments(course_id, course:courses(id, title))")
    .gte("started_at", sevenDaysAgo.toISOString())
    .order("started_at", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data as unknown as RawSession[]) ?? []).map((s) => ({
    duration_s:   s.duration_s,
    started_at:   s.started_at,
    course_id:    s.assignment?.course_id ?? null,
    course_title: s.assignment?.course?.title ?? null,
  }));
}
