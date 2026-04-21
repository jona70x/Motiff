/**
 * @module lib/onboarding
 * Tracks whether the user has completed the first-launch onboarding carousel.
 *
 * The flag is stored in AsyncStorage (device-local) rather than Supabase so
 * it survives sign-out and is available immediately without a network round-trip.
 * Each device independently decides whether to show onboarding; sharing state
 * across devices would complicate the UX for users with multiple devices.
 */

import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = "@motiff/onboarding_complete";

// ── Async helpers ──────────────────────────────────────────────────────────────

/**
 * Reads the AsyncStorage flag and returns true when the user has already
 * completed the onboarding carousel on this device.
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === "true";
  } catch {
    // Storage read failure — default to showing onboarding so the user
    // always has a path through rather than being stuck on a blank screen.
    return false;
  }
}

/**
 * Persists the "onboarding complete" flag so the carousel is never shown again
 * on this device.
 */
export async function markOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
  } catch {
    // Non-fatal — user will see onboarding again next launch, which is a
    // minor UX annoyance rather than a broken feature.
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export type OnboardingState = {
  /** True once the AsyncStorage read has resolved. */
  onboardingChecked: boolean;
  /** True if the user has finished onboarding on this device. */
  onboardingDone: boolean;
  /** Call after the user taps "Get started" to persist the flag and re-render. */
  completeOnboarding: () => Promise<void>;
};

/**
 * Returns the current onboarding state and a callback to complete it.
 * The `onboardingChecked` flag prevents a flash of the onboarding screen
 * while AsyncStorage is being read.
 */
export function useOnboarding(): OnboardingState {
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone, setOnboardingDone]       = useState(false);

  useEffect(() => {
    hasCompletedOnboarding().then((done) => {
      setOnboardingDone(done);
      setOnboardingChecked(true);
    });
  }, []);

  async function completeOnboarding(): Promise<void> {
    await markOnboardingComplete();
    setOnboardingDone(true);
  }

  return { onboardingChecked, onboardingDone, completeOnboarding };
}
