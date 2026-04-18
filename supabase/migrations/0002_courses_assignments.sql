-- 0002_courses_assignments.sql
-- Courses and assignments tables for S0-2 data model.
-- A course belongs to a user; an assignment belongs to a course and user.

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  term text,
  created_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  kind text,
  est_minutes integer,
  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists idx_courses_user_id on public.courses(user_id);
create index if not exists idx_assignments_course_id on public.assignments(course_id);
create index if not exists idx_assignments_user_id on public.assignments(user_id);
create index if not exists idx_assignments_due_at on public.assignments(due_at);
