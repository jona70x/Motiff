/**
 * @module lib/auth
 * Authentication state hook for Motiff.
 *
 * Responsibilities:
 *   1. Hydrate the initial Supabase session on mount.
 *   2. Subscribe to all auth state changes and keep local state in sync.
 *   3. Handle Supabase Auth deep links (password reset, email confirmation).
 *      Links arrive as: motiff://auth/callback#access_token=…&type=recovery
 *      React Native's Linking API exposes the full URL including the fragment,
 *      so we parse the hash parameters and call supabase.auth.setSession().
 *   4. Expose `recoveryMode` — true when the app was opened from a password-
 *      reset email and the user must set a new password before using the app.
 *      The navigator shows ResetPasswordScreen exclusively in this state.
 *
 * Session hygiene:
 *   - `autoRefreshToken: true` is set on the Supabase client; when a refresh
 *     fails Supabase fires SIGNED_OUT with a null session. The hook forwards
 *     that as session = null, which drives navigation back to SignInScreen.
 *   - `SIGNED_OUT` is the canonical signal for "this session is dead"; callers
 *     do not need to handle TOKEN_REFRESHED separately.
 */

import { useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { parseAuthFragment } from "./authHelpers";

// ── Types ──────────────────────────────────────────────────────────────────────

export type AuthState = {
  /** Current Supabase session; null = unauthenticated. */
  session: Session | null;
  /**
   * True while the initial session OR the initial deep-link URL is still
   * resolving. Keeping both gates prevents a brief SignIn flash on cold start
   * when the app is opened from a password-reset or invite email.
   */
  loading: boolean;
  /**
   * True when the user opened the app from a password-reset email.
   * The navigator should show ResetPasswordScreen exclusively in this state.
   * Clears automatically after a successful password update (USER_UPDATED event).
   */
  recoveryMode: boolean;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Parses an auth deep link URL and, if it contains Supabase auth tokens,
 * passes them to supabase.auth.setSession() so the SDK fires the appropriate
 * auth event (PASSWORD_RECOVERY, SIGNED_IN, etc.).
 *
 * Supabase Auth email links use a fragment (hash) to carry tokens, e.g.:
 *   motiff://auth/callback#access_token=…&refresh_token=…&type=recovery
 *
 * @param url - Full deep link URL including fragment.
 */
async function handleAuthDeepLink(url: string): Promise<void> {
  const { access_token, refresh_token } = parseAuthFragment(url);

  if (access_token && refresh_token) {
    // setSession triggers onAuthStateChange with PASSWORD_RECOVERY or SIGNED_IN
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      console.error("auth deep link setSession error:", error.message);
    }
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Returns the current authentication state and subscribes to all auth
 * lifecycle events. Safe to call from multiple components — each call
 * creates its own subscription (Supabase auth is a broadcast channel).
 */
export function useAuthSession(): AuthState {
  const [session, setSession]           = useState<Session | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [urlResolved, setUrlResolved]   = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);

  // loading is true until BOTH the initial session AND the initial URL have
  // resolved. This prevents a SignIn flash when the app cold-starts from a
  // password-reset or invite email link.
  const loading = !sessionResolved || !urlResolved;

  // Ref guards against stale closure in the auth event callback.
  const recoveryModeRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    // ── Deep link wiring ──────────────────────────────────────────────────────

    // Cold start: app launched directly by tapping an auth email link.
    // getInitialURL() resolves once the OS hands us the URL. We must wait for
    // it before clearing `loading` so the navigator never flashes SignInScreen.
    Linking.getInitialURL().then((url) => {
      if (url) handleAuthDeepLink(url);
      if (mounted) setUrlResolved(true);
    });

    // Warm start: app was already running when the link was tapped.
    const linkSub = Linking.addEventListener("url", ({ url }) => {
      handleAuthDeepLink(url);
    });

    // ── Initial session hydration ─────────────────────────────────────────────
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setSessionResolved(true);
    });

    // ── Auth state change subscription ────────────────────────────────────────
    const { data: authSub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted) return;

      switch (event) {
        case "PASSWORD_RECOVERY":
          // User opened the app from a password-reset email.
          // They have a temporary session — keep it so they can call updateUser().
          recoveryModeRef.current = true;
          setRecoveryMode(true);
          setSession(next);
          break;

        case "USER_UPDATED":
          // Password (or other user data) was updated.
          // If we were in recovery mode, the password change is complete — exit it.
          if (recoveryModeRef.current) {
            recoveryModeRef.current = false;
            setRecoveryMode(false);
          }
          setSession(next);
          break;

        case "SIGNED_OUT":
          // Token refresh failure, explicit sign-out, or session expiry.
          // Clear everything so the navigator routes to SignInScreen.
          recoveryModeRef.current = false;
          setRecoveryMode(false);
          setSession(null);
          break;

        default:
          // SIGNED_IN, TOKEN_REFRESHED, INITIAL_SESSION, EMAIL_CONFIRM, etc.
          setSession(next);
          // Mark session as resolved in case the auth event fires before
          // getSession() resolves (e.g. when a deep link triggers SIGNED_IN).
          setSessionResolved(true);
      }
    });

    return () => {
      mounted = false;
      authSub.subscription.unsubscribe();
      linkSub.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Mount-once; loading ref is only read inside the closure, not a dep

  return { session, loading, recoveryMode };
}
