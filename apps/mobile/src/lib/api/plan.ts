/**
 * @module api/plan
 * Supabase data access for daily plan blocks.
 * Plan generation is pure (see packages/domain/plan/generator.ts);
 * this module handles persistence: save, load, and replace.
 */

import { supabase } from "../supabase";
import type { PlanBlock } from "../../../../../packages/domain/plan/generator";

/**
 * A plan block row as stored in Supabase, joined with the assignment title
 * and course title for display purposes.
 */
export type PlanBlockRow = {
  id: string;
  plan_date: string;
  assignment_id: string;
  block_order: number;
  allocated_minutes: number;
  assignment: {
    title: string;
    est_minutes: number | null;
    course: { id: string; title: string } | null;
  } | null;
};

/**
 * Fetches today's plan blocks for the authenticated user, ordered by block_order.
 *
 * @param date - ISO date string (YYYY-MM-DD) for the plan day.
 * @returns Ordered array of plan block rows with joined assignment + course data.
 */
export async function getDailyPlan(date: string): Promise<PlanBlockRow[]> {
  const { data, error } = await supabase
    .from("plan_blocks")
    .select(
      "id, plan_date, assignment_id, block_order, allocated_minutes, " +
      "assignment:assignments(title, est_minutes, course:courses(id, title))"
    )
    .eq("plan_date", date)
    .order("block_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as unknown as PlanBlockRow[]) ?? [];
}

/**
 * Persists a generated plan for a given date by replacing any existing blocks.
 * Uses a delete-then-insert strategy within the same RLS-guarded user scope.
 *
 * @param date   - ISO date string (YYYY-MM-DD) for the plan day.
 * @param blocks - Output of {@link generateDailyPlan}.
 */
export async function saveDailyPlan(date: string, blocks: PlanBlock[]): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  // Delete existing blocks for this date
  const { error: deleteError } = await supabase
    .from("plan_blocks")
    .delete()
    .eq("plan_date", date)
    .eq("user_id", user.id);

  if (deleteError) throw new Error(deleteError.message);

  if (blocks.length === 0) return;

  const rows = blocks.map((b) => ({
    user_id:           user.id,
    plan_date:         date,
    assignment_id:     b.assignmentId,
    block_order:       b.order,
    allocated_minutes: b.allocatedMinutes,
  }));

  const { error: insertError } = await supabase.from("plan_blocks").insert(rows);
  if (insertError) throw new Error(insertError.message);
}
