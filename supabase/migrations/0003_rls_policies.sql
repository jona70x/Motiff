-- 0003_rls_policies.sql
-- Row-level security policies for courses and assignments.
-- A user can only read/write their own rows.

alter table public.courses enable row level security;
alter table public.assignments enable row level security;

-- Courses: select own
drop policy if exists "courses_select_own" on public.courses;
create policy "courses_select_own"
  on public.courses
  for select
  using (auth.uid() = user_id);

-- Courses: insert own
drop policy if exists "courses_insert_own" on public.courses;
create policy "courses_insert_own"
  on public.courses
  for insert
  with check (auth.uid() = user_id);

-- Courses: update own
drop policy if exists "courses_update_own" on public.courses;
create policy "courses_update_own"
  on public.courses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Courses: delete own
drop policy if exists "courses_delete_own" on public.courses;
create policy "courses_delete_own"
  on public.courses
  for delete
  using (auth.uid() = user_id);

-- Assignments: select own
drop policy if exists "assignments_select_own" on public.assignments;
create policy "assignments_select_own"
  on public.assignments
  for select
  using (auth.uid() = user_id);

-- Assignments: insert own
drop policy if exists "assignments_insert_own" on public.assignments;
create policy "assignments_insert_own"
  on public.assignments
  for insert
  with check (auth.uid() = user_id);

-- Assignments: update own
drop policy if exists "assignments_update_own" on public.assignments;
create policy "assignments_update_own"
  on public.assignments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Assignments: delete own
drop policy if exists "assignments_delete_own" on public.assignments;
create policy "assignments_delete_own"
  on public.assignments
  for delete
  using (auth.uid() = user_id);
