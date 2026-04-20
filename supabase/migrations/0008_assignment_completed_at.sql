-- 0008_assignment_completed_at.sql
-- Adds completed_at to assignments for S2-4 completion tracking.

alter table public.assignments
  add column if not exists completed_at timestamptz;

create index if not exists idx_assignments_completed_at
  on public.assignments(completed_at)
  where completed_at is not null;
