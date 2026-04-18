-- 0007_focus_sessions.sql
-- Pomodoro session log. One row per started session regardless of outcome.

do $$ begin
  create type public.focus_outcome as enum ('completed', 'cancelled', 'paused_ended');
exception when duplicate_object then null;
end $$;

create table if not exists public.focus_sessions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  assignment_id uuid       references public.assignments(id) on delete set null,
  started_at   timestamptz not null,
  ended_at     timestamptz not null,
  duration_s   integer     not null check (duration_s >= 0),
  outcome      public.focus_outcome not null,
  created_at   timestamptz not null default now()
);

create index idx_focus_sessions_user_id    on public.focus_sessions(user_id);
create index idx_focus_sessions_started_at on public.focus_sessions(started_at);

alter table public.focus_sessions enable row level security;

create policy "focus_sessions_select_own"
  on public.focus_sessions for select
  using (auth.uid() = user_id);

create policy "focus_sessions_insert_own"
  on public.focus_sessions for insert
  with check (auth.uid() = user_id);

create policy "focus_sessions_update_own"
  on public.focus_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "focus_sessions_delete_own"
  on public.focus_sessions for delete
  using (auth.uid() = user_id);
