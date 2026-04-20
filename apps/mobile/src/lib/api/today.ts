import { supabase } from "../supabase";
import type { Assignment } from "../schema";

export type AssignmentWithCourse = Assignment & {
  course: { id: string; title: string } | null;
};

export async function getTodayAssignments(): Promise<AssignmentWithCourse[]> {
  const { data, error } = await supabase
    .from("assignments")
    .select("*, course:courses(id, title)")
    .is("completed_at", null)
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data as AssignmentWithCourse[]) || [];
}
