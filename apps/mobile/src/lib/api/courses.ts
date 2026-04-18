import { supabase } from "../supabase";
import { Course, CourseInsert, courseInsertSchema } from "../schema";

export async function createCourse(data: CourseInsert): Promise<Course | null> {
  const validated = courseInsertSchema.parse(data);
  const { data: course, error } = await supabase
    .from("courses")
    .insert({ ...validated, user_id: (await supabase.auth.getUser()).data.user?.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return course;
}

export async function getCourses(): Promise<Course[]> {
  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return courses || [];
}

export async function getCourseById(id: string): Promise<Course | null> {
  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return course || null;
}

export async function updateCourse(id: string, data: Partial<CourseInsert>): Promise<Course | null> {
  const { data: course, error } = await supabase
    .from("courses")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return course;
}

export async function deleteCourse(id: string): Promise<void> {
  const { error } = await supabase.from("courses").delete().eq("id", id);

  if (error) throw new Error(error.message);
}
