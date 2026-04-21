/**
 * Tests for course lifecycle domain logic.
 *
 * buildListItems is imported from lib/courseLifecycle — the same module
 * used by CoursesScreen — so there is a single source of truth.
 * The filter logic tested in the second suite mirrors the client-side
 * filter applied in getTodayAssignments (api/today.ts).
 */

import { buildListItems, type CourseListItem } from "./courseLifecycle";
import type { Course } from "./schema";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeCourse(overrides: Partial<Course> & { id: string }): Course {
  return {
    user_id: "user-1",
    title: "Test Course",
    term: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ── buildListItems ────────────────────────────────────────────────────────────

describe("buildListItems", () => {
  it("produces a single Active header and no courses for an empty list", () => {
    const items = buildListItems([]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "header", label: "Active" });
  });

  it("places all active courses under the Active header", () => {
    const courses = [
      makeCourse({ id: "c1", title: "Math" }),
      makeCourse({ id: "c2", title: "CS" }),
    ];
    const items = buildListItems(courses);
    const courseItems = items.filter((i) => i.kind === "course");
    expect(courseItems).toHaveLength(2);
    expect(items[0]).toMatchObject({ kind: "header", label: "Active" });
  });

  it("places completed courses under the Completed header (no Active header when all complete)", () => {
    const courses = [
      makeCourse({ id: "c1", title: "Done", completed_at: new Date().toISOString() }),
    ];
    const items = buildListItems(courses);
    const headers = items.filter((i) => i.kind === "header") as Extract<CourseListItem, { kind: "header" }>[];
    expect(headers.map((h) => h.label)).toEqual(["Completed"]);
  });

  it("emits both headers when active and completed courses coexist", () => {
    const courses = [
      makeCourse({ id: "c1", title: "Active" }),
      makeCourse({ id: "c2", title: "Done", completed_at: new Date().toISOString() }),
    ];
    const items = buildListItems(courses);
    const headers = items.filter((i) => i.kind === "header") as Extract<CourseListItem, { kind: "header" }>[];
    expect(headers.map((h) => h.label)).toEqual(["Active", "Completed"]);
  });

  it("always places active courses before completed courses regardless of input order", () => {
    const courses = [
      makeCourse({ id: "c1", title: "Done", completed_at: new Date().toISOString() }),
      makeCourse({ id: "c2", title: "Active" }),
    ];
    const items = buildListItems(courses);
    const courseItems = items.filter((i) => i.kind === "course") as Extract<CourseListItem, { kind: "course" }>[];
    expect(courseItems[0]?.course.id).toBe("c2");
    expect(courseItems[1]?.course.id).toBe("c1");
  });

  it("preserves input ordering within each section", () => {
    const courses = [
      makeCourse({ id: "a1", title: "First active" }),
      makeCourse({ id: "a2", title: "Second active" }),
      makeCourse({ id: "c1", title: "First completed", completed_at: new Date().toISOString() }),
      makeCourse({ id: "c2", title: "Second completed", completed_at: new Date().toISOString() }),
    ];
    const items = buildListItems(courses);
    const courseItems = items.filter((i) => i.kind === "course") as Extract<CourseListItem, { kind: "course" }>[];
    expect(courseItems.map((i) => i.course.id)).toEqual(["a1", "a2", "c1", "c2"]);
  });
});

// ── Today-screen filter logic ─────────────────────────────────────────────────

describe("completed-course assignment filter (client-side)", () => {
  type MockAssignment = {
    id: string;
    course: { id: string; completed_at: string | null } | null;
  };

  /**
   * Mirrors the filter in getTodayAssignments (api/today.ts).
   * If the screen logic changes, update that file and this test together.
   */
  function filterActiveCourseAssignments(rows: MockAssignment[]): MockAssignment[] {
    return rows.filter((a) => !a.course?.completed_at);
  }

  it("keeps assignments whose course is active", () => {
    const rows: MockAssignment[] = [
      { id: "a1", course: { id: "c1", completed_at: null } },
    ];
    expect(filterActiveCourseAssignments(rows)).toHaveLength(1);
  });

  it("removes assignments whose course is completed", () => {
    const rows: MockAssignment[] = [
      { id: "a1", course: { id: "c1", completed_at: new Date().toISOString() } },
    ];
    expect(filterActiveCourseAssignments(rows)).toHaveLength(0);
  });

  it("handles a null course join gracefully (keeps the assignment)", () => {
    const rows: MockAssignment[] = [
      { id: "a1", course: null },
    ];
    expect(filterActiveCourseAssignments(rows)).toHaveLength(1);
  });

  it("filters correctly in a mixed list", () => {
    const rows: MockAssignment[] = [
      { id: "a1", course: { id: "c1", completed_at: null } },
      { id: "a2", course: { id: "c2", completed_at: new Date().toISOString() } },
      { id: "a3", course: { id: "c1", completed_at: null } },
    ];
    const result = filterActiveCourseAssignments(rows);
    expect(result.map((r) => r.id)).toEqual(["a1", "a3"]);
  });
});
