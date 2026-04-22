/**
 * @module lib/authHelpers
 * Pure helper functions for Supabase Auth deep-link parsing and password
 * validation. Extracted so they can be imported by both the auth hook and
 * the screen-level unit tests without duplicating logic.
 */

// ── Constants ──────────────────────────────────────────────────────────────────

/** Minimum password length — mirrors Supabase's enforced minimum. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Auth types that Supabase embeds in the deep-link fragment.
 * Only these types carry tokens we care about; all others are ignored.
 */
const VALID_AUTH_TYPES = ["recovery", "email"] as const;
export type ValidAuthType = (typeof VALID_AUTH_TYPES)[number];

// ── Fragment parsing ───────────────────────────────────────────────────────────

/** Parameters extracted from a Supabase Auth deep-link fragment. */
export type AuthFragmentParams = {
  access_token?: string;
  refresh_token?: string;
  type?: ValidAuthType;
};

/**
 * Parses the hash fragment from a Supabase Auth deep-link URL.
 *
 * Returns the `access_token`, `refresh_token`, and `type` when the URL
 * matches our scheme and carries a recognised auth type. Returns an empty
 * object for any other URL so callers can safely ignore the result.
 *
 * @param url - Full deep-link URL, e.g.
 *   `motiff://auth/callback#access_token=…&refresh_token=…&type=recovery`
 */
export function parseAuthFragment(url: string): AuthFragmentParams {
  if (
    !url.startsWith("motiff://auth/callback") &&
    !url.startsWith("motiff://reset-password")
  ) {
    return {};
  }

  const fragment = url.split("#")[1] ?? "";
  if (!fragment) return {};

  const params = Object.fromEntries(new URLSearchParams(fragment));

  // Ignore links whose `type` is not one we handle — avoids acting on
  // unexpected Supabase-internal link types.
  if (!params["type"] || !(VALID_AUTH_TYPES as readonly string[]).includes(params["type"])) {
    return {};
  }

  return {
    access_token:  params["access_token"],
    refresh_token: params["refresh_token"],
    type:          params["type"] as ValidAuthType,
  };
}

// ── Password validation ────────────────────────────────────────────────────────

/**
 * Validates the password and confirm-password values from ResetPasswordScreen.
 *
 * Checks are ordered by severity:
 *   1. Minimum length (Supabase rejects shorter passwords anyway)
 *   2. Confirmation match
 *
 * @returns A human-readable error string, or `null` if the inputs are valid.
 */
export function validatePasswordReset(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirm) {
    return "Passwords don't match.";
  }
  return null;
}
