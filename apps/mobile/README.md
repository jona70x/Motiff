# @motiff/mobile

Expo + TypeScript mobile app for Motiff.

## Setup

1. From the monorepo root:
   ```sh
   pnpm install
   ```
2. Create `apps/mobile/.env.local` by copying `.env.example` from the repo root, then fill in Supabase values:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx
   ```
   Use the **publishable** (anon) key only. The secret/service-role key must never be embedded in the client.
3. Run:
   ```sh
   pnpm --filter @motiff/mobile ios     # iOS simulator
   pnpm --filter @motiff/mobile android # Android emulator
   ```

## Scripts

- `pnpm --filter @motiff/mobile lint` — ESLint flat config
- `pnpm --filter @motiff/mobile typecheck` — `tsc --noEmit`

## Supabase auth

Email + password only for Sprint 0 (magic links and OAuth are out of scope per DR-007). The session is persisted to `AsyncStorage` and auto-refreshed by the Supabase JS client.

## Monorepo notes

Metro is configured in `metro.config.js` to watch the workspace root and resolve modules from both `apps/mobile/node_modules` and the hoisted root. pnpm uses `nodeLinker=hoisted` so native modules (React Native requires a flat layout) resolve correctly.
