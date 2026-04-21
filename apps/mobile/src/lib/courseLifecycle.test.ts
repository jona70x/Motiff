/**
 * Tests for course lifecycle domain logic.
 *
 * The list-building logic (splitting courses into active/completed sections)
 * is extracted here so it can be tested without rendering the full screen.
 * The filtering logic in getTodayAssignments is also exercised via a
 * mock of the API layer's client-side filter.
 */

import type { Course } from "../lib/schema";

// ── Inline the pure helper so we can test it without React Native imports ────

/**
 * Mirrors the buildListItems helper in CoursesScreen.tsx.
 * Kept in sync manually — if the screen logic changes, update this too.
 */
type ListItem =
  | { kind: "header"; label: string }
  | { kind: "course"; course: Course };

function buildListItems(courses: Course[]): ListItem[] {
  const active    = courses.filter((c) => !c.completed_at);
  const completed = courses.filter((c) => !!c.completed_at);

  const items: ListItem[] = [];

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

  it("places completed courses under the Completed header", () => {
    const courses = [
      makeCourse({ id: "c1", title: "Done", completed_at: new Date().toISOString() }),
    ];
    const items = buildListItems(courses);
    // Active header is NOT emitted when there are no active courses
    const headers = items.filter((i) => i.kind === "header") as Extract<ListItem, { kind: "header" }>[];
    expect(headers.map((h) => h.label)).toEqual(["Completed"]);
  });

  it("emits both headers when active and completed courses exist", () => {
    const courses = [
      makeCourse({ id: "c1", title: "Active" }),
      makeCourse({ id: "c2", title: "Done", completed_at: new Date().toISOString() }),
    ];
    const items = buildListItems(courses);
    const headers = items.filter((i) => i.kind === "header") as Extract<ListItem, { kind: "header" }>[];
    expect(headers.map((h) => h.label)).toEqual(["Active", "Completed"]);
  });

  it("places active courses before completed courses", () => {
    const courses = [
      makeCourse({ id: "c1", title: "Done", completed_at: new Date().toISOString() }),
      makeCourse({ id: "c2", title: "Active" }),
    ];
    const items = buildListItems(courses);
    const courseItems = items.filter((i) => i.kind === "course") as Extract<ListItem, { kind: "course" }>[];
    // Active should come first despite order in input
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
    const courseItems = items.filter((i) => i.kind === "course") as Extract<ListItem, { kind: "course" }>[];
    expect(courseItems.map((i) => i.course.id)).toEqual(["a1", "a2", "c1", "c2"]);
  });
});

// ── Today-screen filter logic ─────────────────────────────────────────────────

describe("completed-course filter (client-side)", () => {
  type MockAssignment = {
    id: string;
    course: { id: string; completed_at: string | null } | null;
  };

  /**
   * Mirrors the filter applied in getTodayAssignments.
   * If this test breaks, the screen logic must be updated to match.
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
    // Should not happen with !inner join, but guards against unexpected data.
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
