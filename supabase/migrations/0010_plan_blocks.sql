-- 0010_plan_blocks.sql
-- Stores generated daily plan blocks for S3-2/S3-3.
-- Each row is one assignment slot in a user's plan for a given date.
-- The plan is regenerated on demand; old rows for the same user+date are
-- replaced atomically (delete-then-insert) by the API layer.

create table if not exists public.plan_blocks (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.profiles(id) on delete cascade,
  plan_date        date        not null,
  assignment_id    uuid        not null references public.assignments(id) on delete cascade,
  block_order      integer     not null check (block_order >= 0),
  allocated_minutes integer    not null check (allocated_minutes > 0),
  created_at       timestamptz not null default now()
);

-- Unique slot per user+date+assignment (prevents duplicates on re-generate)
create unique index if not exists idx_plan_blocks_user_date_assignment
  on public.plan_blocks(user_id, plan_date, assignment_id);

create index if not exists idx_plan_blocks_user_date
  on public.plan_blocks(user_id, plan_date);

alter table public.plan_blocks enable row level security;

create policy "plan_blocks_select_own"
  on public.plan_blocks for select
  using (auth.uid() = user_id);

create policy "plan_blocks_insert_own"
  on public.plan_blocks for insert
  with check (auth.uid() = user_id);

create policy "plan_blocks_delete_own"
  on public.plan_blocks for delete
  using (auth.uid() = user_id);
