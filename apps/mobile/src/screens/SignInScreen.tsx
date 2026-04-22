/**
 * @module screens/SignInScreen
 * Sign-in screen for the closed-beta build of Motiff.
 *
 * Open sign-ups are disabled in Supabase Auth (Auth → Settings →
 * "Allow new users to sign up" = off). New users are admitted via
 * Supabase invite emails sent from the dashboard or admin API.
 *
 * Invite flow:
 *   1. Admin calls supabase.auth.admin.inviteUserByEmail(email, {
 *        redirectTo: "motiff://auth/callback"
 *      })
 *   2. Tester receives a one-time magic link via email.
 *   3. Tapping the link opens the app via the deep-link handler in auth.ts,
 *      which calls supabase.auth.setSession() and signs the user in.
 *   4. On first sign-in the user sees the onboarding carousel.
 */

import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { C, F, R, shadow } from "../theme";

type Props = NativeStackScreenProps<any, "SignIn">;

/**
 * Sign-in form. Sign-up is disabled — new accounts require an invite email
 * from the Motiff team. Supabase will reject open sign-up attempts at the
 * API level; this screen reflects that by removing the sign-up path entirely.
 */
export function SignInScreen({ navigation }: Props) {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const disabled = submitting || email.trim().length === 0 || password.length === 0;

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        {/* Bricolage Grotesque wordmark */}
        <Text style={styles.wordmark}>Motiff</Text>
        <Text style={styles.tagline}>Study smarter, not harder.</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!submitting}
            returnKeyType="next"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
            autoComplete="password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!submitting}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
          />

          {error !== null && <Text style={styles.error}>{error}</Text>}

          {/* Hero sign-in button */}
          <Pressable
            accessibilityRole="button"
            style={[styles.heroButton, disabled && styles.buttonDisabled]}
            disabled={disabled}
            onPress={onSubmit}
          >
            {submitting ? (
              <ActivityIndicator color={C.lemonText} />
            ) : (
              <Text style={[styles.heroButtonText, disabled && styles.heroButtonTextDisabled]}>Sign in</Text>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("ForgotPassword")}
            style={styles.forgotButton}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
        </View>

        {/* Closed-beta notice */}
        <View style={styles.betaBanner}>
          <Text style={styles.betaTitle}>Closed beta</Text>
          <Text style={styles.betaBody}>
            Motiff is currently invite-only. If you received an invite email,
            tap the link in that email to set your password and sign in.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    padding: 28,
    backgroundColor: C.bg,
  },
  inner: {
    gap: 20,
  },
  wordmark: {
    fontSize: 48,
    fontFamily: F.display,     // Bricolage Grotesque Bold
    color: C.text,
    textAlign: "center",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    fontFamily: F.medium,
    color: C.textSub,
    textAlign: "center",
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: F.body,
    color: C.text,
    ...shadow.card,
  },
  error: {
    color: C.error,
    fontSize: 14,
    fontFamily: F.medium,
  },
  heroButton: {
    backgroundColor: C.lemon,
    borderRadius: R.full,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
    ...shadow.float,
  },
  buttonDisabled: {
    backgroundColor: C.border,
    opacity: 1,
    shadowOpacity: 0,
    elevation: 0,
  },
  heroButtonText: {
    color: C.lemonText,
    fontSize: 17,
    fontFamily: F.bold,
  },
  heroButtonTextDisabled: {
    color: C.textMuted,
  },
  forgotButton: {
    alignItems: "center",
    paddingVertical: 6,
  },
  forgotText: {
    color: C.indigo,
    fontSize: 14,
    fontFamily: F.medium,
  },
  betaBanner: {
    backgroundColor: C.indigoLight,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    padding: 14,
    gap: 4,
  },
  betaTitle: {
    fontSize: 13,
    fontFamily: F.bold,
    color: C.indigo,
  },
  betaBody: {
    fontSize: 13,
    fontFamily: F.body,
    color: C.textSub,
    lineHeight: 18,
  },
});
