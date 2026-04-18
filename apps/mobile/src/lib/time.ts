export type DueBucket = "today" | "this_week" | "later";

export function isOverdue(dueAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!dueAt) return false;
  const due = new Date(dueAt);
  if (isNaN(due.getTime())) return false;
  return due.getTime() < now.getTime();
}

export function bucketAssignment(dueAt: string | null | undefined, now: Date = new Date()): DueBucket {
  if (!dueAt) return "later";

  const due = new Date(dueAt);
  if (isNaN(due.getTime())) return "later";

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  if (due < startOfTomorrow) return "today";
  if (due < endOfWeek) return "this_week";
  return "later";
}

export function formatRelativeDue(dueAt: string | null | undefined, now: Date = new Date()): string {
  if (!dueAt) return "No due date";

  const due = new Date(dueAt);
  if (isNaN(due.getTime())) return "No due date";

  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffMs < 0) {
    const overdueDays = Math.floor(-diffDays);
    if (overdueDays === 0) return "Overdue";
    if (overdueDays === 1) return "1 day overdue";
    return `${overdueDays} days overdue`;
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  if (due < startOfTomorrow) {
    if (diffHours < 1) {
      const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return `Due in ${mins}m`;
    }
    return `Due in ${Math.floor(diffHours)}h`;
  }

  if (due < endOfWeek) {
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `Due ${weekdays[due.getDay()]}`;
  }

  return `Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}
