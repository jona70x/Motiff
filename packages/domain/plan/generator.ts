/**
 * @module plan/generator
 * Pure functions for generating a user's daily study plan.
 * No I/O — accepts assignments and a budget, returns ordered plan blocks.
 */

/** Fallback session length when an assignment has no est_minutes. */
export const DEFAULT_EST_MINUTES = 25;

/**
 * Minimum input shape required by the plan generator.
 * Matches a subset of the Assignment row from Supabase.
 */
export type PlanInput = {
  /** UUID of the assignment. */
  id: string;
  /** Display title shown in the plan block. */
  title: string;
  /** ISO-8601 due date, or null if undated. */
  due_at: string | null;
  /** Estimated work time in minutes, or null if unknown. */
  est_minutes: number | null;
  /** Parent course UUID — preserved in output for grouping. */
  course_id: string | null;
};

/**
 * One time-block in the generated daily plan.
 * Block order is 0-based; lower = higher urgency.
 */
export type PlanBlock = {
  /** UUID of the assignment this block represents. */
  assignmentId: string;
  /** Urgency score used for ordering (higher = more urgent). */
  urgencyScore: number;
  /** Minutes allocated to this block (capped at dailyBudget remainder). */
  allocatedMinutes: number;
  /** 0-based position in today's plan. */
  order: number;
  /** Mirrors PlanInput.course_id for downstream grouping. */
  courseId: string | null;
};

/**
 * Computes an urgency score for a single assignment.
 *
 * Scoring bands:
 * - Overdue (daysUntilDue < 0):  1000 + |daysUntilDue| (oldest overdue = highest)
 * - Due today (0 ≤ days < 1):    500
 * - Due this week (1 ≤ days < 7): 100 / daysUntilDue
 * - Due later (days ≥ 7):         10 / daysUntilDue
 * - No due date:                  1 (lowest fixed score)
 *
 * @param due_at - ISO-8601 due timestamp, or null
 * @param now    - Reference instant (injectable for tests)
 * @returns Numeric urgency score; higher = schedule earlier
 */
export function computeUrgencyScore(due_at: string | null, now: Date = new Date()): number {
  if (!due_at) return 1;

  const dueMs = new Date(due_at).getTime();
  const daysUntilDue = (dueMs - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysUntilDue < 0)  return 1000 + Math.abs(daysUntilDue);
  if (daysUntilDue < 1)  return 500;
  if (daysUntilDue < 7)  return 100 / daysUntilDue;
  return 10 / daysUntilDue;
}

/**
 * Generates an ordered list of plan blocks that fit within a daily minute budget.
 *
 * Algorithm:
 * 1. Score every assignment by urgency.
 * 2. Sort descending by score (most urgent first).
 * 3. Walk the sorted list; allocate `est_minutes` (or DEFAULT_EST_MINUTES) to each
 *    assignment until the budget is exhausted.
 * 4. A block that would exceed the remaining budget is allocated the remainder
 *    rather than being dropped entirely (partial allocation).
 *
 * Assignments with no remaining budget after earlier blocks are omitted from output.
 *
 * @param assignments       - Uncompleted assignments to schedule.
 * @param dailyBudgetMinutes - Total minutes available in the day (e.g. 120).
 * @param now               - Reference instant; defaults to Date.now() (injectable for tests).
 * @returns Ordered array of PlanBlock (may be empty if budget is 0 or no assignments).
 */
export function generateDailyPlan(
  assignments: PlanInput[],
  dailyBudgetMinutes: number,
  now: Date = new Date()
): PlanBlock[] {
  if (dailyBudgetMinutes <= 0 || assignments.length === 0) return [];

  const scored = assignments.map((a) => ({
    assignment: a,
    urgencyScore: computeUrgencyScore(a.due_at, now),
  }));

  scored.sort((a, b) => b.urgencyScore - a.urgencyScore);

  const blocks: PlanBlock[] = [];
  let budgetRemaining = dailyBudgetMinutes;
  let order = 0;

  for (const { assignment, urgencyScore } of scored) {
    if (budgetRemaining <= 0) break;

    const requested = assignment.est_minutes ?? DEFAULT_EST_MINUTES;
    const allocated = Math.min(requested, budgetRemaining);

    blocks.push({
      assignmentId:    assignment.id,
      urgencyScore,
      allocatedMinutes: allocated,
      order:           order++,
      courseId:        assignment.course_id,
    });

    budgetRemaining -= allocated;
  }

  return blocks;
}
