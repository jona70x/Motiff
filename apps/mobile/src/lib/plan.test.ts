import {
  computeUrgencyScore,
  generateDailyPlan,
  DEFAULT_EST_MINUTES,
  type PlanInput,
} from "../../../../packages/domain/plan/generator";

const NOW = new Date("2026-04-20T12:00:00");

function daysFromNow(days: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function makeAssignment(overrides: Partial<PlanInput> & { id: string }): PlanInput {
  return {
    title: "Test",
    due_at: null,
    est_minutes: null,
    course_id: null,
    ...overrides,
  };
}

// ── computeUrgencyScore ──────────────────────────────────────────────────────

describe("computeUrgencyScore", () => {
  it("returns 1 for null due date", () => {
    expect(computeUrgencyScore(null, NOW)).toBe(1);
  });

  it("returns ≥ 1000 for overdue assignments", () => {
    const score = computeUrgencyScore(daysFromNow(-2), NOW);
    expect(score).toBeGreaterThanOrEqual(1000);
  });

  it("overdue score increases the further past due", () => {
    const s1 = computeUrgencyScore(daysFromNow(-1), NOW);
    const s2 = computeUrgencyScore(daysFromNow(-5), NOW);
    expect(s2).toBeGreaterThan(s1);
  });

  it("returns 500 for due today", () => {
    const score = computeUrgencyScore(daysFromNow(0.5), NOW);
    expect(score).toBe(500);
  });

  it("returns score in (10, 100) range for this-week items", () => {
    const score = computeUrgencyScore(daysFromNow(3), NOW);
    expect(score).toBeGreaterThan(10);
    expect(score).toBeLessThan(100);
  });

  it("returns score < 10 for items due in 2+ weeks", () => {
    const score = computeUrgencyScore(daysFromNow(14), NOW);
    expect(score).toBeLessThan(10);
  });
});

// ── generateDailyPlan ────────────────────────────────────────────────────────

describe("generateDailyPlan", () => {
  it("returns empty array for zero budget", () => {
    const result = generateDailyPlan(
      [makeAssignment({ id: "a1", est_minutes: 30 })],
      0,
      NOW
    );
    expect(result).toHaveLength(0);
  });

  it("returns empty array for empty assignments", () => {
    expect(generateDailyPlan([], 120, NOW)).toHaveLength(0);
  });

  it("orders assignments by urgency (most urgent first)", () => {
    const assignments: PlanInput[] = [
      makeAssignment({ id: "later",   due_at: daysFromNow(10), est_minutes: 25 }),
      makeAssignment({ id: "today",   due_at: daysFromNow(0.5), est_minutes: 25 }),
      makeAssignment({ id: "thisweek", due_at: daysFromNow(3), est_minutes: 25 }),
    ];
    const result = generateDailyPlan(assignments, 120, NOW);
    expect(result[0]?.assignmentId).toBe("today");
    expect(result[1]?.assignmentId).toBe("thisweek");
    expect(result[2]?.assignmentId).toBe("later");
  });

  it("uses DEFAULT_EST_MINUTES when est_minutes is null", () => {
    const result = generateDailyPlan(
      [makeAssignment({ id: "a1", due_at: daysFromNow(1) })],
      120,
      NOW
    );
    expect(result[0]?.allocatedMinutes).toBe(DEFAULT_EST_MINUTES);
  });

  it("does not exceed the daily budget", () => {
    const assignments: PlanInput[] = [
      makeAssignment({ id: "a1", due_at: daysFromNow(1), est_minutes: 60 }),
      makeAssignment({ id: "a2", due_at: daysFromNow(2), est_minutes: 60 }),
      makeAssignment({ id: "a3", due_at: daysFromNow(3), est_minutes: 60 }),
    ];
    const result = generateDailyPlan(assignments, 100, NOW);
    const totalAllocated = result.reduce((n, b) => n + b.allocatedMinutes, 0);
    expect(totalAllocated).toBeLessThanOrEqual(100);
  });

  it("partially allocates the last block when budget is tight", () => {
    const assignments: PlanInput[] = [
      makeAssignment({ id: "a1", due_at: daysFromNow(1), est_minutes: 60 }),
      makeAssignment({ id: "a2", due_at: daysFromNow(2), est_minutes: 60 }),
    ];
    const result = generateDailyPlan(assignments, 90, NOW);
    expect(result).toHaveLength(2);
    expect(result[0]?.allocatedMinutes).toBe(60);
    expect(result[1]?.allocatedMinutes).toBe(30);
  });

  it("assigns sequential 0-based order values", () => {
    const assignments: PlanInput[] = [
      makeAssignment({ id: "a1", due_at: daysFromNow(1), est_minutes: 20 }),
      makeAssignment({ id: "a2", due_at: daysFromNow(2), est_minutes: 20 }),
    ];
    const result = generateDailyPlan(assignments, 120, NOW);
    expect(result[0]?.order).toBe(0);
    expect(result[1]?.order).toBe(1);
  });

  it("omits assignments beyond exhausted budget", () => {
    const assignments: PlanInput[] = [
      makeAssignment({ id: "a1", due_at: daysFromNow(1), est_minutes: 60 }),
      makeAssignment({ id: "a2", due_at: daysFromNow(2), est_minutes: 60 }),
    ];
    const result = generateDailyPlan(assignments, 60, NOW);
    expect(result).toHaveLength(1);
    expect(result[0]?.assignmentId).toBe("a1");
  });
});
