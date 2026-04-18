-- 0006_llm_usage.sql
-- Per-user monthly LLM cost tracking for enforcing the budget cap (DR-010).
-- One row per user per calendar month (UTC). Upserted on every model call.

create table if not exists public.llm_usage (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid    not null references public.profiles(id) on delete cascade,
  month         date    not null, -- first day of the calendar month, UTC
  tokens_in     integer not null default 0 check (tokens_in  >= 0),
  tokens_out    integer not null default 0 check (tokens_out >= 0),
  usd_estimate  numeric(10, 6) not null default 0 check (usd_estimate >= 0),
  updated_at    timestamptz not null default now(),

  unique (user_id, month)
);

alter table public.llm_usage enable row level security;

-- Users can only read their own usage (for budget-exceeded UX).
drop policy if exists "llm_usage_select_own" on public.llm_usage;
create policy "llm_usage_select_own"
  on public.llm_usage for select
  using (auth.uid() = user_id);

-- Insert/update is done by the Edge Function using the service role key;
-- the mobile client never writes this table directly.
-- No insert/update policies needed for anon/authenticated roles.

create index if not exists llm_usage_user_month_idx
  on public.llm_usage (user_id, month);
