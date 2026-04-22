/**
 * @module screens/ForgotPasswordScreen
 * Lets the user request a password-reset email.
 *
 * Flow:
 *   1. User enters their email address.
 *   2. We call supabase.auth.resetPasswordForEmail() with a deep-link redirectTo.
 *   3. A success state is shown regardless of whether the email exists —
 *      this is intentional to prevent email enumeration attacks.
 *   4. The reset email contains a link to motiff://auth/callback which the
 *      app intercepts, parses the token, and navigates to ResetPasswordScreen.
 *
 * The redirectTo URL must be added to the Supabase dashboard under:
 *   Authentication → URL Configuration → Redirect URLs
 *   Value: motiff://auth/callback
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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<any, "ForgotPassword">;

// The redirectTo URL registered in Supabase dashboard Redirect URLs.
const RESET_REDIRECT_URL = "motiff://auth/callback";

// ── Component ──────────────────────────────────────────────────────────────────

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const canSubmit = !submitting && email.trim().length > 0 && !sent;

  /**
   * Sends a password-reset email via Supabase Auth.
   * Supabase always returns success even for unknown emails (enumeration defence);
   * we mirror that by showing the success state regardless.
   */
  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);

    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: RESET_REDIRECT_URL }
      );

      if (err) {
        // Surface rate-limit or configuration errors to the user.
        setError(err.message);
        return;
      }

      setSent(true);
    } finally {
      setSubmitting(false);
    }
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
          {/* Back navigation */}
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
          >
            <Text style={styles.backText}>← Back to sign in</Text>
          </Pressable>

          <View style={styles.card}>
            <Text style={styles.title}>Reset password</Text>

            {sent ? (
              /* ── Success state ── */
              <View style={styles.successContainer}>
                <Text style={styles.successIcon}>✉</Text>
                <Text style={styles.successTitle}>Check your email</Text>
                <Text style={styles.successBody}>
                  If an account exists for{" "}
                  <Text style={styles.bold}>{email.trim()}</Text>, you'll receive a
                  password reset link shortly.{"\n\n"}
                  Tap the link in the email to open Motiff and set a new password.
                </Text>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => navigation.goBack()}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryButtonText}>Back to sign in</Text>
                </Pressable>
              </View>
            ) : (
              /* ── Email input state ── */
              <>
                <Text style={styles.description}>
                  Enter your account email and we'll send you a reset link.
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="send"
                  value={email}
                  onChangeText={(t) => {
                    setError(null);
                    setEmail(t);
                  }}
                  onSubmitEditing={handleSubmit}
                  editable={!submitting}
                  accessibilityLabel="Email address"
                />

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
                  accessibilityLabel="Send reset email"
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send reset email</Text>
                  )}
                </Pressable>
              </>
            )}
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
  backButton: {
    marginBottom: 24,
  },
  backText: {
    fontSize: 15,
    color: "#3355cc",
    fontWeight: "500",
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
  successContainer: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  successBody: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
  },
  bold: {
    fontWeight: "600",
    color: "#333",
  },
});
