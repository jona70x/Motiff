/**
 * @module lib/courseLifecycle
 * Pure helpers for course lifecycle UI logic.
 * No I/O — imported by both CoursesScreen and the test suite.
 */

import type { Course } from "./schema";

/**
 * A flat list item used by CoursesScreen's FlatList.
 * Section headers and course cards are interleaved in a single array so
 * a single FlatList is sufficient (avoids nested-FlatList scroll issues).
 */
export type CourseListItem =
  | { kind: "header"; label: string }
  | { kind: "course"; course: Course };

/**
 * Splits courses into active and completed buckets and flattens them into
 * a single section-headed array suitable for FlatList.
 *
 * Section rules:
 * - When there are active courses, an "Active" header is always emitted first.
 * - When the list is empty, an "Active" header is still emitted (the screen
 *   renders its empty state below it).
 * - "Completed" header and its courses follow when any completed course exists.
 * - Within each section, input order is preserved.
 *
 * @param courses - All courses for the current user (active and completed mixed).
 * @returns Flat array with header and course items interleaved.
 */
export function buildListItems(courses: Course[]): CourseListItem[] {
  const active    = courses.filter((c) => !c.completed_at);
  const completed = courses.filter((c) => !!c.completed_at);

  const items: CourseListItem[] = [];

  if (active.length > 0 || completed.length === 0) {
    items.push({ kind: "header", label: "Active" });
    active.forEach((c) => items.push({ kind: "course", course: c }));
  }

  if (completed.length > 0) {
    items.push({ kind: "header", label: "Completed" });
    completed.forEach((c) => items.push({ kind: "course", course: c }));
  }

  return items;
}
