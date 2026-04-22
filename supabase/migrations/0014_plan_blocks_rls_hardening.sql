-- 0014_plan_blocks_rls_hardening.sql
-- Tighten the plan_blocks UPDATE policy to prevent FK hijacking.
--
-- Problem: the policy added in 0013 checks only `user_id = auth.uid()`,
-- which allows a caller to change `assignment_id` to point at another
-- user's assignment (a different user's data becomes visible/linked).
--
-- Fix: add a WITH CHECK subquery that verifies the target assignment_id
-- belongs to the authenticated user, so FK repointing is impossible.
-- The USING clause already blocks reading rows that don't belong to the
-- caller; the WITH CHECK now enforces the same constraint after the write.

do $$ begin
  -- Drop the weaker policy from 0013 before recreating it.
  drop policy if exists "plan_blocks_update_own" on public.plan_blocks;
exception when undefined_object then null;
end $$;

create policy "plan_blocks_update_own"
  on public.plan_blocks
  for update
  using (auth.uid() = user_id)
  with check (
    -- Row must still belong to the caller after the update
    auth.uid() = user_id
    -- assignment_id must also reference an assignment the caller owns,
    -- preventing FK repointing to another user's records
    and exists (
      select 1
      from public.assignments a
      where a.id = assignment_id
        and a.user_id = auth.uid()
    )
  );
