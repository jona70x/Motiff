/**
 * @module screens/ResetPasswordScreen
 * Shown exclusively when the app is in recovery mode — i.e. the user tapped
 * a password-reset email link that was intercepted by the deep-link handler
 * in auth.ts and exchanged for a temporary session via supabase.auth.setSession().
 *
 * On successful submission:
 *   - supabase.auth.updateUser() is called with the new password.
 *   - Supabase fires the USER_UPDATED auth event.
 *   - auth.ts clears recoveryMode when it sees USER_UPDATED.
 *   - The navigator automatically transitions back to the main app because
 *     the user now has a valid session and recoveryMode is false.
 *
 * The user cannot navigate away from this screen — they must either set a
 * new password or sign out. This prevents them from accessing the app with
 * the one-time recovery session.
 */

import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

// Password must be at least 8 characters — mirrors Supabase's minimum.
const MIN_PASSWORD_LENGTH = 8;

// ── Component ──────────────────────────────────────────────────────────────────

export function ResetPasswordScreen() {
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // ── Validation ────────────────────────────────────────────────────────────

  /**
   * Returns a human-readable validation error, or null if inputs are valid.
   * Called on submit to avoid showing red text as the user types.
   */
  function validate(): string | null {
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (password !== confirm) {
      return "Passwords don't match.";
    }
    return null;
  }

  const canSubmit = !submitting && password.length >= MIN_PASSWORD_LENGTH && confirm.length > 0;

  // ── Submit ────────────────────────────────────────────────────────────────

  /**
   * Validates the input and calls supabase.auth.updateUser() to set the
   * new password. On success, the USER_UPDATED event clears recovery mode
   * in auth.ts and the navigator routes to the main app automatically.
   */
  async function handleSubmit() {
    if (!canSubmit) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const { error: err } = await supabase.auth.updateUser({ password });

      if (err) {
        setError(err.message);
        return;
      }

      // Success: auth.ts will receive USER_UPDATED, clear recoveryMode,
      // and the navigator transitions to the main app automatically.
      // No manual navigation needed here.
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Signs the user out of the recovery session. auth.ts handles SIGNED_OUT
   * by setting session = null, which routes the navigator to SignInScreen.
   */
  async function handleCancel() {
    await supabase.auth.signOut();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>Set new password</Text>
            <Text style={styles.description}>
              Choose a strong password of at least {MIN_PASSWORD_LENGTH} characters.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="New password"
              autoCapitalize="none"
              autoComplete="new-password"
              secureTextEntry
              returnKeyType="next"
              value={password}
              onChangeText={(t) => {
                setError(null);
                setPassword(t);
              }}
              editable={!submitting}
              accessibilityLabel="New password"
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              autoCapitalize="none"
              autoComplete="new-password"
              secureTextEntry
              returnKeyType="done"
              value={confirm}
              onChangeText={(t) => {
                setError(null);
                setConfirm(t);
              }}
              onSubmitEditing={handleSubmit}
              editable={!submitting}
              accessibilityLabel="Confirm new password"
            />

            {/* Real-time length hint */}
            {password.length > 0 && password.length < MIN_PASSWORD_LENGTH && (
              <Text style={styles.hint}>
                {MIN_PASSWORD_LENGTH - password.length} more character
                {MIN_PASSWORD_LENGTH - password.length === 1 ? "" : "s"} needed
              </Text>
            )}

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
              disabled={!canSubmit}
              onPress={handleSubmit}
              accessibilityRole="button"
              accessibilityLabel="Set new password"
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Set new password</Text>
              )}
            </Pressable>

            {/* Escape hatch: discard the recovery session and return to sign-in */}
            <Pressable
              onPress={handleCancel}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Cancel and return to sign in"
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel — return to sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f6f6f8",
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  card: {
    gap: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  description: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d6d6dc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: "#999",
    marginTop: -4,
  },
  errorBanner: {
    backgroundColor: "#ffebee",
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: "#b00020",
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: "#111",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 14,
    color: "#888",
  },
});
