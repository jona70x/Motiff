/**
 * Tests for S4-2 auth-hardening logic.
 *
 * The two areas exercised here are pure functions extracted from the
 * auth module and the screen-level validation rules:
 *
 *   1. Deep-link URL parsing — extracting access/refresh tokens and the
 *      auth type from a motiff://auth/callback#... URL.
 *   2. Password reset validation — the rules enforced by ResetPasswordScreen
 *      before calling supabase.auth.updateUser().
 */

// ── Deep-link token extraction ─────────────────────────────────────────────────

/**
 * Mirrors the URL parsing logic in auth.ts handleAuthDeepLink().
 * Extracted here so it can be unit-tested without mocking the Supabase SDK.
 */
function parseAuthFragment(url: string): {
  access_token?: string;
  refresh_token?: string;
  type?: string;
} {
  if (!url.includes("auth/callback") && !url.includes("reset-password")) return {};
  const fragment = url.split("#")[1] ?? "";
  if (!fragment) return {};
  return Object.fromEntries(new URLSearchParams(fragment)) as {
    access_token?: string;
    refresh_token?: string;
    type?: string;
  };
}

describe("parseAuthFragment", () => {
  const RESET_URL =
    "motiff://auth/callback#access_token=abc123&refresh_token=def456&type=recovery&token_type=bearer";

  it("extracts access_token from a password-recovery deep link", () => {
    const result = parseAuthFragment(RESET_URL);
    expect(result.access_token).toBe("abc123");
  });

  it("extracts refresh_token from a password-recovery deep link", () => {
    const result = parseAuthFragment(RESET_URL);
    expect(result.refresh_token).toBe("def456");
  });

  it("extracts the type parameter", () => {
    const result = parseAuthFragment(RESET_URL);
    expect(result.type).toBe("recovery");
  });

  it("returns an empty object for a non-auth URL", () => {
    const result = parseAuthFragment("motiff://courses/abc-123");
    expect(result).toEqual({});
  });

  it("returns an empty object for a URL with no fragment", () => {
    const result = parseAuthFragment("motiff://auth/callback");
    expect(result).toEqual({});
  });

  it("handles email-confirmation deep links (SIGNED_IN type)", () => {
    const url = "motiff://auth/callback#access_token=tok&refresh_token=ref&type=email";
    const result = parseAuthFragment(url);
    expect(result.type).toBe("email");
    expect(result.access_token).toBe("tok");
  });

  it("handles reset-password path variant", () => {
    const url = "motiff://reset-password#access_token=x&refresh_token=y&type=recovery";
    const result = parseAuthFragment(url);
    expect(result.access_token).toBe("x");
  });
});

// ── Password validation (ResetPasswordScreen) ──────────────────────────────────

const MIN_PASSWORD_LENGTH = 8;

/**
 * Mirrors the validate() function in ResetPasswordScreen.
 */
function validatePasswordReset(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirm) {
    return "Passwords don't match.";
  }
  return null;
}

describe("validatePasswordReset", () => {
  it("returns null for valid matching passwords at minimum length", () => {
    expect(validatePasswordReset("abcdefgh", "abcdefgh")).toBeNull();
  });

  it("returns null for valid matching passwords above minimum length", () => {
    expect(validatePasswordReset("SuperSecure99!", "SuperSecure99!")).toBeNull();
  });

  it("rejects a password that is too short", () => {
    const result = validatePasswordReset("short", "short");
    expect(result).toMatch(/at least 8 characters/i);
  });

  it("rejects mismatched passwords even if both meet the length requirement", () => {
    const result = validatePasswordReset("password123", "password456");
    expect(result).toMatch(/don't match/i);
  });

  it("prioritises the length check over the mismatch check", () => {
    // Short password + mismatch → length error shown first
    const result = validatePasswordReset("abc", "xyz");
    expect(result).toMatch(/at least 8 characters/i);
  });

  it("rejects an empty password", () => {
    const result = validatePasswordReset("", "");
    expect(result).toMatch(/at least 8 characters/i);
  });

  it("accepts exactly 8 characters", () => {
    expect(validatePasswordReset("12345678", "12345678")).toBeNull();
  });

  it("rejects exactly 7 characters", () => {
    expect(validatePasswordReset("1234567", "1234567")).not.toBeNull();
  });
});
