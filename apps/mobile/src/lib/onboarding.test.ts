/**
 * Tests for the onboarding state helpers in lib/onboarding.ts.
 *
 * AsyncStorage is mocked so tests run without a React Native environment.
 * The hook itself (useOnboarding) is not tested here — that would require
 * a full React render environment; the hook is thin over the two async helpers.
 */

// ── Mock AsyncStorage ──────────────────────────────────────────────────────────

const store: Record<string, string> = {};

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async (key: string) => store[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    store[key] = value;
  }),
}));

import { hasCompletedOnboarding, markOnboardingComplete } from "./onboarding";
import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_A = "user-uuid-aaa";
const USER_B = "user-uuid-bbb";

// ── Helpers ────────────────────────────────────────────────────────────────────

function clearStore() {
  for (const key of Object.keys(store)) delete store[key];
  jest.clearAllMocks();
}

// ── hasCompletedOnboarding ─────────────────────────────────────────────────────

describe("hasCompletedOnboarding", () => {
  beforeEach(clearStore);

  it("returns false when the key has never been set", async () => {
    expect(await hasCompletedOnboarding(USER_A)).toBe(false);
  });

  it("returns false when the key is present but not 'true'", async () => {
    store[`@motiff/onboarding_complete/${USER_A}`] = "false";
    expect(await hasCompletedOnboarding(USER_A)).toBe(false);
  });

  it("returns true when the key is 'true'", async () => {
    store[`@motiff/onboarding_complete/${USER_A}`] = "true";
    expect(await hasCompletedOnboarding(USER_A)).toBe(true);
  });

  it("returns false (safe default) when AsyncStorage throws", async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error("storage error"));
    expect(await hasCompletedOnboarding(USER_A)).toBe(false);
  });

  it("is independent per user — user B unaffected by user A completing", async () => {
    await markOnboardingComplete(USER_A);
    expect(await hasCompletedOnboarding(USER_B)).toBe(false);
  });

  it("a new account on the same device does not inherit a prior user's flag", async () => {
    // Simulate prior user finishing onboarding
    await markOnboardingComplete(USER_A);
    // New account has a different ID — their flag must be false
    expect(await hasCompletedOnboarding(USER_B)).toBe(false);
  });
});

// ── markOnboardingComplete ─────────────────────────────────────────────────────

describe("markOnboardingComplete", () => {
  beforeEach(clearStore);

  it("persists 'true' so hasCompletedOnboarding returns true afterward", async () => {
    await markOnboardingComplete(USER_A);
    expect(await hasCompletedOnboarding(USER_A)).toBe(true);
  });

  it("calls AsyncStorage.setItem with the user-scoped key", async () => {
    await markOnboardingComplete(USER_A);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      `@motiff/onboarding_complete/${USER_A}`,
      "true"
    );
  });

  it("does not affect other users when one completes onboarding", async () => {
    await markOnboardingComplete(USER_A);
    expect(await hasCompletedOnboarding(USER_B)).toBe(false);
  });

  it("does not throw when AsyncStorage.setItem fails", async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("disk full"));
    await expect(markOnboardingComplete(USER_A)).resolves.toBeUndefined();
  });
});
