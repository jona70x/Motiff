import { bucketAssignment, formatRelativeDue, urgencyRailColor } from "./time";

// ── urgencyRailColor ───────────────────────────────────────────────────────────

describe("urgencyRailColor", () => {
  const NOW = new Date("2026-04-22T12:00:00Z");

  it("returns railLater color for null due date",      () => expect(urgencyRailColor(null, NOW)).toBe("#D1D5DB"));
  it("returns railLater color for undefined due date", () => expect(urgencyRailColor(undefined, NOW)).toBe("#D1D5DB"));
  it("returns railLater for an invalid date string",   () => expect(urgencyRailColor("not-a-date", NOW)).toBe("#D1D5DB"));

  it("returns railOverdue for a past due date", () =>
    expect(urgencyRailColor("2026-04-21T00:00:00Z", NOW)).toBe("#EF4444"));

  it("returns railToday for a due date within 24 h", () =>
    expect(urgencyRailColor("2026-04-22T18:00:00Z", NOW)).toBe("#F97316"));

  it("returns railWeek for a due date 2 days away", () =>
    expect(urgencyRailColor("2026-04-24T12:00:00Z", NOW)).toBe("#4F46E5"));

  it("returns railWeek for a due date 6 days away", () =>
    expect(urgencyRailColor("2026-04-28T12:00:00Z", NOW)).toBe("#4F46E5"));

  it("returns railLater for a due date 8 days away", () =>
    expect(urgencyRailColor("2026-04-30T12:00:00Z", NOW)).toBe("#D1D5DB"));
});

describe("bucketAssignment", () => {
  const now = new Date(2025, 5, 15, 10, 0, 0);

  it("places null due_at in later bucket", () => {
    expect(bucketAssignment(null, now)).toBe("later");
    expect(bucketAssignment(undefined, now)).toBe("later");
  });

  it("places invalid date in later bucket", () => {
    expect(bucketAssignment("not-a-date", now)).toBe("later");
  });

  it("places same-day due_at in today bucket", () => {
    const sameDay = new Date(2025, 5, 15, 23, 59, 0).toISOString();
    expect(bucketAssignment(sameDay, now)).toBe("today");
  });

  it("places overdue assignment in today bucket", () => {
    const yesterday = new Date(2025, 5, 14, 23, 59, 0).toISOString();
    expect(bucketAssignment(yesterday, now)).toBe("today");
  });

  it("places tomorrow in this_week bucket", () => {
    const tomorrow = new Date(2025, 5, 16, 9, 0, 0).toISOString();
    expect(bucketAssignment(tomorrow, now)).toBe("this_week");
  });

  it("places 6 days from now in this_week bucket", () => {
    const sixDays = new Date(2025, 5, 21, 12, 0, 0).toISOString();
    expect(bucketAssignment(sixDays, now)).toBe("this_week");
  });

  it("places 7+ days from now in later bucket", () => {
    const weekLater = new Date(2025, 5, 22, 12, 0, 0).toISOString();
    expect(bucketAssignment(weekLater, now)).toBe("later");
  });

  it("handles DST spring-forward correctly (US, Mar 9, 2025 at 2am)", () => {
    const beforeDst = new Date(2025, 2, 9, 1, 0, 0);
    const afterDst = new Date(2025, 2, 10, 1, 0, 0).toISOString();
    expect(bucketAssignment(afterDst, beforeDst)).toBe("this_week");
  });

  it("handles DST fall-back correctly (US, Nov 2, 2025 at 2am)", () => {
    const beforeDst = new Date(2025, 10, 1, 23, 0, 0);
    const afterDst = new Date(2025, 10, 2, 23, 0, 0).toISOString();
    expect(bucketAssignment(afterDst, beforeDst)).toBe("this_week");
  });
});

describe("formatRelativeDue", () => {
  const now = new Date(2025, 5, 15, 10, 0, 0);

  it("returns 'No due date' for null/undefined", () => {
    expect(formatRelativeDue(null, now)).toBe("No due date");
    expect(formatRelativeDue(undefined, now)).toBe("No due date");
  });

  it("returns hours for same-day future", () => {
    const in3h = new Date(2025, 5, 15, 13, 0, 0).toISOString();
    expect(formatRelativeDue(in3h, now)).toBe("Due in 3h");
  });

  it("returns minutes when less than 1 hour away", () => {
    const in30m = new Date(2025, 5, 15, 10, 30, 0).toISOString();
    expect(formatRelativeDue(in30m, now)).toBe("Due in 30m");
  });

  it("returns weekday for this week", () => {
    const wed = new Date(2025, 5, 18, 15, 0, 0).toISOString();
    expect(formatRelativeDue(wed, now)).toBe("Due Wed");
  });

  it("returns month+day for later dates", () => {
    const later = new Date(2025, 7, 1, 12, 0, 0).toISOString();
    expect(formatRelativeDue(later, now)).toBe("Due Aug 1");
  });

  it("returns 'Overdue' for just-past", () => {
    const past = new Date(2025, 5, 15, 9, 0, 0).toISOString();
    expect(formatRelativeDue(past, now)).toBe("Overdue");
  });

  it("returns '1 day overdue' for yesterday", () => {
    const yesterday = new Date(2025, 5, 14, 9, 0, 0).toISOString();
    expect(formatRelativeDue(yesterday, now)).toBe("1 day overdue");
  });

  it("returns 'N days overdue' for older", () => {
    const olderPast = new Date(2025, 5, 10, 9, 0, 0).toISOString();
    expect(formatRelativeDue(olderPast, now)).toBe("5 days overdue");
  });
});
