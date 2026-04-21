/**
 * @module api/today
 * Queries assignments that belong to the user's active study day.
 *
 * "Today's assignments" means: incomplete, belonging to an active (non-completed) course.
 * Assignments from completed courses are excluded so finishing a semester immediately
 * removes those items from Today and the Plan screen.
 */

import { supabase } from "../supabase";
import type { Assignment } from "../schema";

/**
 * An assignment row joined with its parent course.
 * `completed_at` on the course is included so client-side filtering can exclude
 * assignments from completed courses without a second round-trip.
 */
export type AssignmentWithCourse = Assignment & {
  course: { id: string; title: string; completed_at: string | null } | null;
};

/**
 * Fetches all uncompleted assignments for the authenticated user, ordered by due date.
 * Assignments whose parent course is marked as completed are excluded from the result.
 *
 * @returns Assignments with their parent course joined in, in due-date ascending order.
 * @throws If the query fails.
 */
export async function getTodayAssignments(): Promise<AssignmentWithCourse[]> {
  const { data, error } = await supabase
    .from("assignments")
    .select("*, course:courses(id, title, completed_at)")
    .is("completed_at", null) // assignment must be incomplete
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);

  // Filter out assignments whose course has been completed.
  // Done client-side because PostgREST's embedded-filter syntax for IS NULL
  // on a joined column is not supported in the stable supabase-js v2 API.
  const rows = (data as AssignmentWithCourse[]) || [];
  return rows.filter((a) => !a.course?.completed_at);
}

/**
 * Returns all of today's assignments except the specified one.
 * Used to populate the timer-transfer target list.
 *
 * @param excludeAssignmentId - The assignment currently in the focus timer.
 */
export async function getTransferTargets(excludeAssignmentId: string): Promise<AssignmentWithCourse[]> {
  const all = await getTodayAssignments();
  return all.filter((a) => a.id !== excludeAssignmentId);
}
