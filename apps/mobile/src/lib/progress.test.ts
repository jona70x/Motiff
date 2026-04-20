import {
  buildWeekSummary,
  type SessionRecord,
  type CompletionRecord,
  type CourseSummary,
} from "../../../../packages/domain/progress/summary";

function makeNow(): Date {
  // Fixed reference: Monday 2026-04-20 12:00 local
  return new Date("2026-04-20T12:00:00");
}

function dateStr(daysAgo: number): string {
  const d = new Date("2026-04-20T12:00:00");
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

const NO_SESSIONS: SessionRecord[] = [];
const NO_COMPLETIONS: CompletionRecord[] = [];

describe("buildWeekSummary — completions", () => {
  it("returns zero assignmentsCompleted when completions is empty", () => {
    const summary = buildWeekSummary(NO_SESSIONS, NO_COMPLETIONS, makeNow());
    const total = summary.courseSummaries.reduce((n: number, c: CourseSummary) => n + c.assignmentsCompleted, 0);
    expect(total).toBe(0);
  });

  it("counts completions per course", () => {
    const completions: CompletionRecord[] = [
      { completed_at: dateStr(0), course_id: "c1", course_title: "Math" },
      { completed_at: dateStr(1), course_id: "c1", course_title: "Math" },
      { completed_at: dateStr(2), course_id: "c2", course_title: "History" },
    ];
    const summary = buildWeekSummary(NO_SESSIONS, completions, makeNow());

    const math = summary.courseSummaries.find((c: CourseSummary) => c.courseId === "c1");
    const history = summary.courseSummaries.find((c: CourseSummary) => c.courseId === "c2");

    expect(math?.assignmentsCompleted).toBe(2);
    expect(history?.assignmentsCompleted).toBe(1);
  });

  it("merges completion counts with session minutesFocused for the same course", () => {
    const sessions: SessionRecord[] = [
      { duration_s: 1800, started_at: dateStr(0), course_id: "c1", course_title: "Math" },
    ];
    const completions: CompletionRecord[] = [
      { completed_at: dateStr(0), course_id: "c1", course_title: "Math" },
    ];
    const summary = buildWeekSummary(sessions, completions, makeNow());
    const math = summary.courseSummaries.find((c: CourseSummary) => c.courseId === "c1");

    expect(math?.minutesFocused).toBe(30);
    expect(math?.assignmentsCompleted).toBe(1);
  });

  it("adds a course entry for completions with no sessions", () => {
    const completions: CompletionRecord[] = [
      { completed_at: dateStr(0), course_id: "c99", course_title: "Art" },
    ];
    const summary = buildWeekSummary(NO_SESSIONS, completions, makeNow());
    const art = summary.courseSummaries.find((c: CourseSummary) => c.courseId === "c99");

    expect(art).toBeDefined();
    expect(art?.assignmentsCompleted).toBe(1);
    expect(art?.minutesFocused).toBe(0);
  });

  it("defaults completions to [] when omitted (backwards compat)", () => {
    const sessions: SessionRecord[] = [
      { duration_s: 600, started_at: dateStr(0), course_id: "c1", course_title: "Math" },
    ];
    const summary = buildWeekSummary(sessions, undefined, makeNow());
    expect(summary.courseSummaries[0]?.assignmentsCompleted).toBe(0);
  });
});
