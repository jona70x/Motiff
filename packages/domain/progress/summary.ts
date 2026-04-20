export type SessionRecord = {
  duration_s: number;
  started_at: string;
  course_id: string | null;
  course_title: string | null;
};

export type CompletionRecord = {
  completed_at: string;
  course_id: string;
  course_title: string | null;
};

export type DayBar = {
  date: string;    // YYYY-MM-DD in local time
  label: string;   // "Mon", "Tue", …
  minutes: number;
  isToday: boolean;
};

export type CourseSummary = {
  courseId: string;
  courseTitle: string;
  minutesFocused: number;
  assignmentsCompleted: number;
};

export type WeekSummary = {
  days: DayBar[];        // 7 entries, oldest → today
  totalMinutes: number;
  courseSummaries: CourseSummary[];
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function localDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function buildWeekSummary(
  sessions: SessionRecord[],
  completions: CompletionRecord[] = [],
  now: Date = new Date()
): WeekSummary {
  // Build rolling 7-day window: [6 days ago … today]
  const days: DayBar[] = [];
  const todayStr = localDateString(now);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dateStr = localDateString(d);
    days.push({
      date: dateStr,
      label: DAY_LABELS[d.getDay()] ?? "",
      minutes: 0,
      isToday: dateStr === todayStr,
    });
  }

  const dayIndex = new Map(days.map((d, i) => [d.date, i]));
  const courseMap = new Map<string, CourseSummary>();

  for (const s of sessions) {
    const sessionDate = localDateString(new Date(s.started_at));
    const idx = dayIndex.get(sessionDate);
    const day = idx !== undefined ? days[idx] : undefined;
    if (day) {
      day.minutes += Math.round(s.duration_s / 60);
    }

    if (s.course_id) {
      if (!courseMap.has(s.course_id)) {
        courseMap.set(s.course_id, {
          courseId: s.course_id!,
          courseTitle: s.course_title ?? s.course_id!,
          minutesFocused: 0,
          assignmentsCompleted: 0,
        });
      }
      courseMap.get(s.course_id!)!.minutesFocused += Math.round(s.duration_s / 60);
    }
  }

  for (const c of completions) {
    if (!courseMap.has(c.course_id)) {
      courseMap.set(c.course_id, {
        courseId: c.course_id,
        courseTitle: c.course_title ?? c.course_id,
        minutesFocused: 0,
        assignmentsCompleted: 0,
      });
    }
    courseMap.get(c.course_id)!.assignmentsCompleted += 1;
  }

  const totalMinutes = days.reduce((sum, d) => sum + d.minutes, 0);
  const courseSummaries = [...courseMap.values()].sort(
    (a, b) => b.minutesFocused - a.minutesFocused
  );

  return { days, totalMinutes, courseSummaries };
}
