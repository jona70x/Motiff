-- S3-4: Add daily_budget_minutes to profiles.
-- Null means "use the app default (120 min)".
-- Both lower and upper bounds are enforced at the DB level so no invalid values
-- can persist regardless of how the row is written (app, admin scripts, etc.).
-- Upper bound mirrors MAX_DAILY_BUDGET_MINUTES in packages/domain/plan/budget.ts.

alter table public.profiles
  add column if not exists daily_budget_minutes integer
    check (daily_budget_minutes > 0 and daily_budget_minutes <= 1440);
