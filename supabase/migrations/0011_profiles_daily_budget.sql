-- S3-4: Add daily_budget_minutes to profiles.
-- Null means "use the app default (120 min)".
-- Positive-integer constraint enforced at DB level so no invalid values persist.

alter table public.profiles
  add column if not exists daily_budget_minutes integer
    check (daily_budget_minutes > 0);
