import { supabase } from "../supabase";
import {
  Assignment,
  AssignmentInsert,
  assignmentInsertSchema,
} from "../schema";

export async function createAssignment(courseId: string, data: AssignmentInsert): Promise<Assignment | null> {
  const validated = assignmentInsertSchema.parse(data);
  const { data: assignment, error } = await supabase
    .from("assignments")
    .insert({
      ...validated,
      course_id: courseId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return assignment;
}

export async function getAssignmentsByCourse(courseId: string): Promise<Assignment[]> {
  const { data: assignments, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("course_id", courseId)
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return assignments || [];
}

export async function getAllAssignments(): Promise<Assignment[]> {
  const { data: assignments, error } = await supabase
    .from("assignments")
    .select("*")
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return assignments || [];
}

export async function getAssignmentById(id: string): Promise<Assignment | null> {
  const { data: assignment, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return assignment || null;
}

export type AssignmentWithCourse = Assignment & {
  course: { id: string; title: string } | null;
};

export async function getAssignmentWithCourse(id: string): Promise<AssignmentWithCourse | null> {
  const { data, error } = await supabase
    .from("assignments")
    .select("*, course:courses(id, title)")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return (data as AssignmentWithCourse) || null;
}

export async function updateAssignment(id: string, data: Partial<AssignmentInsert>): Promise<Assignment | null> {
  const { data: assignment, error } = await supabase
    .from("assignments")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return assignment;
}

export async function deleteAssignment(id: string): Promise<void> {
  const { error } = await supabase.from("assignments").delete().eq("id", id);

  if (error) throw new Error(error.message);
}

export async function completeAssignment(id: string): Promise<Assignment | null> {
  const { data, error } = await supabase
    .from("assignments")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function uncompleteAssignment(id: string): Promise<Assignment | null> {
  const { data, error } = await supabase
    .from("assignments")
    .update({ completed_at: null })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
