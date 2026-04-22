/**
 * @module lib/onboarding
 * Tracks whether the user has completed the first-launch onboarding carousel.
 *
 * The flag is stored in AsyncStorage keyed by user ID so each Supabase user
 * gets an independent onboarding state on this device. This prevents a
 * situation where a previously-completed session leaves the flag set, causing
 * a new account created on the same device to skip the carousel.
 *
 * AsyncStorage is preferred over Supabase user_metadata because it's
 * available immediately (no network round-trip) and onboarding is inherently
 * a per-device experience.
 */

import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Key helpers ────────────────────────────────────────────────────────────────

/** Returns the AsyncStorage key scoped to a specific user. */
function onboardingKey(userId: string): string {
  return `@motiff/onboarding_complete/${userId}`;
}

// ── Async helpers ──────────────────────────────────────────────────────────────

/**
 * Returns true if the given user has already completed the onboarding carousel
 * on this device.
 *
 * @param userId - The Supabase user ID (session.user.id).
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(onboardingKey(userId));
    return value === "true";
  } catch {
    // Storage read failure — default to showing onboarding so the user
    // always has a path through rather than being stuck on a blank screen.
    return false;
  }
}

/**
 * Persists the "onboarding complete" flag for the given user so the carousel
 * is never shown again on this device.
 *
 * @param userId - The Supabase user ID (session.user.id).
 */
export async function markOnboardingComplete(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(onboardingKey(userId), "true");
  } catch {
    // Non-fatal — user will see onboarding again next launch, which is a
    // minor UX annoyance rather than a broken feature.
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export type OnboardingState = {
  /** True once the AsyncStorage read has resolved. */
  onboardingChecked: boolean;
  /** True if this user has finished onboarding on this device. */
  onboardingDone: boolean;
  /** Call after the user taps "Get started" to persist the flag and re-render. */
  completeOnboarding: () => Promise<void>;
};

/**
 * Returns the current onboarding state for the given user and a callback to
 * complete it. The `onboardingChecked` flag prevents a flash of the onboarding
 * screen while AsyncStorage is being read.
 *
 * Pass `null` when there is no active session — the hook will report
 * `onboardingDone: true` so the navigator does not show the carousel to
 * unauthenticated users (they need to sign in first).
 *
 * @param userId - The active Supabase user ID, or null if unauthenticated.
 */
export function useOnboarding(userId: string | null): OnboardingState {
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone, setOnboardingDone]       = useState(false);

  useEffect(() => {
    if (userId === null) {
      // No active user — skip the carousel. It will re-run when the user
      // signs in and userId becomes non-null.
      setOnboardingDone(true);
      setOnboardingChecked(true);
      return;
    }

    setOnboardingChecked(false);
    hasCompletedOnboarding(userId).then((done) => {
      setOnboardingDone(done);
      setOnboardingChecked(true);
    });
  }, [userId]);

  async function completeOnboarding(): Promise<void> {
    if (userId) await markOnboardingComplete(userId);
    setOnboardingDone(true);
  }

  return { onboardingChecked, onboardingDone, completeOnboarding };
}
