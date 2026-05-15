/**
 * @module screens/SignInScreen
 * Sign-in screen for the closed-beta build of Motiff.
 *
 * Open sign-ups are disabled in Supabase Auth (Auth → Settings →
 * "Allow new users to sign up" = off). New users are admitted via
 * Supabase invite emails sent from the dashboard or admin API.
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
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { C, F, R } from "../theme";

type Props = NativeStackScreenProps<any, "SignIn">;

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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Full-bleed gradient background */}
      <LinearGradient
        colors={[C.bg, "#fff2e6"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.content}>
        <Text style={styles.wordmark}>Motiff</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

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

          {/* Deep-indigo sign-in button with depth shadow */}
          <Pressable
            accessibilityRole="button"
            style={[styles.signInDepth, disabled && styles.buttonDisabled]}
            disabled={disabled}
            onPress={onSubmit}
          >
            <View style={styles.signInButton}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signInText}>Sign in</Text>
              )}
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("ForgotPassword")}
            style={styles.forgotButton}
          >
            {({ pressed }) => (
              <Text style={[styles.forgotText, pressed && styles.forgotTextUnderline]}>
                Forgot password?
              </Text>
            )}
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
    backgroundColor: C.bg,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 20,
  },
  wordmark: {
    fontSize: 36,
    fontFamily: F.display,
    fontWeight: "800",
    color: C.ink,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: F.body,
    color: C.textSub,
    textAlign: "center",
    marginTop: -12,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: F.body,
    color: C.text,
  },
  error: {
    color: C.error,
    fontSize: 14,
    fontFamily: F.medium,
  },
  signInDepth: {
    borderRadius: R.lg,
    backgroundColor: "#0a081a",
    marginTop: 4,
  },
  signInButton: {
    borderRadius: R.lg,
    backgroundColor: "#1a1633",
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 4,
  },
  signInText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: F.display,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  forgotButton: {
    alignItems: "center",
    paddingVertical: 6,
  },
  forgotText: {
    color: "#5b3df5",
    fontSize: 14,
    fontFamily: F.bold,
    fontWeight: "700",
  },
  forgotTextUnderline: {
    textDecorationLine: "underline",
  },
  betaBanner: {
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#c8d4f5",
    padding: 14,
    gap: 4,
  },
  betaTitle: {
    fontSize: 13,
    fontFamily: F.bold,
    color: "#5b3df5",
  },
  betaBody: {
    fontSize: 13,
    fontFamily: F.body,
    color: C.textSub,
    lineHeight: 18,
  },
});
