-- 0013_rls_fixes.sql
-- Fills RLS policy gaps identified in the S4-4 security audit.
--
--   1. profiles   — missing DELETE policy (needed for account deletion workflows)
--   2. plan_blocks — missing UPDATE policy (needed if blocks are ever mutated)
--
-- All policies are idempotent (DO block catches duplicate_object).

-- ── profiles: delete own ───────────────────────────────────────────────────────
-- Allows a user to delete their own profile row.
-- In practice the delete-account Edge Function uses the service role and
-- triggers cascading deletion of auth.users, which cascades here via FK.
-- This policy is added for completeness and to allow future user-space APIs.

do $$ begin
  create policy "profiles_delete_own"
    on public.profiles
    for delete
    using (auth.uid() = id);
exception when duplicate_object then null;
end $$;

-- ── plan_blocks: update own ────────────────────────────────────────────────────
-- Allows a user to update their own plan block rows.
-- Needed if the app tracks block-level state (e.g. "started", "skipped")
-- without regenerating the full plan.

do $$ begin
  create policy "plan_blocks_update_own"
    on public.plan_blocks
    for update
    using    (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
