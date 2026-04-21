/**
 * @module api/courses
 * Supabase data access for the courses table.
 * All operations are scoped to the authenticated user via RLS.
 */

import { supabase } from "../supabase";
import { Course, CourseInsert, courseInsertSchema } from "../schema";

/**
 * Response shape returned by the delete-course Edge Function.
 * On success `filesRemoved` counts the storage objects that were cleaned up.
 */
type DeleteCourseResponse =
  | { ok: true; filesRemoved: number }
  | { ok: false; reason: string; message?: string };

/**
 * Creates a new course for the authenticated user.
 *
 * @param data - Course title and optional term.
 * @returns The newly created course row.
 * @throws If the insert fails or the user is not authenticated.
 */
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

/**
 * Returns all courses for the authenticated user, ordered by creation date descending.
 * Includes `completed_at` so callers can split active vs. completed without a second query.
 *
 * @returns All course rows (both active and completed).
 */
export async function getCourses(): Promise<Course[]> {
  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return courses || [];
}

/**
 * Returns a single course by ID.
 * Returns null without throwing if the course is not found (PGRST116).
 *
 * @param id - UUID of the course.
 */
export async function getCourseById(id: string): Promise<Course | null> {
  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return course || null;
}

/**
 * Updates mutable fields (title, term) on a course.
 *
 * @param id   - UUID of the course to update.
 * @param data - Partial course fields to write.
 */
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

/**
 * Marks a course as completed by stamping `completed_at` with the current time.
 * The course's assignments are excluded from Today and Plan screens while completed.
 * Call {@link uncompleteCourse} to reopen it.
 *
 * @param id - UUID of the course to complete.
 * @throws If the update fails or the course is not found.
 */
export async function completeCourse(id: string): Promise<void> {
  const { error } = await supabase
    .from("courses")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/**
 * Reopens a completed course by clearing `completed_at`.
 * The course's uncompleted assignments will reappear in Today and Plan screens.
 *
 * @param id - UUID of the course to reopen.
 * @throws If the update fails or the course is not found.
 */
export async function uncompleteCourse(id: string): Promise<void> {
  const { error } = await supabase
    .from("courses")
    .update({ completed_at: null })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/**
 * Fully deletes a course via the delete-course Edge Function.
 *
 * The Edge Function performs the deletion in this order:
 *   1. Lists and removes all storage objects under syllabi/{userId}/{courseId}/.
 *   2. Deletes the course row; FK ON DELETE CASCADE handles all child rows.
 *
 * Using an Edge Function (rather than a direct client delete) ensures storage
 * objects are always cleaned up even if the client drops mid-operation (DR-016).
 *
 * @param id          - UUID of the course to delete.
 * @param accessToken - The user's current JWT, forwarded to the Edge Function.
 * @throws If the function returns an error or the network call fails.
 */
export async function deleteCourseWithStorage(id: string, accessToken: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<DeleteCourseResponse>("delete-course", {
    body: { course_id: id },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (error) throw new Error(error.message);
  if (!data?.ok) {
    throw new Error(
      (data as Extract<DeleteCourseResponse, { ok: false }>)?.message ?? "Failed to delete course"
    );
  }
}
