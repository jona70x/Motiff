import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

type Mode = "signIn" | "signUp";
type Props = NativeStackScreenProps<any, "SignIn">;

export function SignInScreen({ navigation }: Props) {
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = submitting || email.trim().length === 0 || password.length === 0;

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signUp") {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (err) {
          setError(err.message);
          return;
        }
        if (!data.session) {
          Alert.alert(
            "Check your email",
            "If email confirmation is enabled, confirm via the link before signing in.",
          );
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Motiff</Text>
        <Text style={styles.subtitle}>
          {mode === "signIn" ? "Sign in to continue" : "Create your account"}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!submitting}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          autoCapitalize="none"
          autoComplete={mode === "signUp" ? "new-password" : "password"}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!submitting}
        />

        {error !== null && <Text style={styles.error}>{error}</Text>}

        <Pressable
          accessibilityRole="button"
          style={[styles.primaryButton, disabled && styles.buttonDisabled]}
          disabled={disabled}
          onPress={onSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {mode === "signIn" ? "Sign in" : "Sign up"}
            </Text>
          )}
        </Pressable>

        {/* Forgot password — only shown on sign-in mode */}
        {mode === "signIn" && (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("ForgotPassword")}
            style={styles.forgotButton}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setError(null);
            setMode(mode === "signIn" ? "signUp" : "signIn");
          }}
        >
          <Text style={styles.switchText}>
            {mode === "signIn"
              ? "New here? Create an account"
              : "Already have an account? Sign in"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f6f6f8",
  },
  card: {
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    marginBottom: 16,
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
  error: {
    color: "#b00020",
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: "#111",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  forgotButton: {
    alignItems: "center",
    paddingVertical: 4,
  },
  forgotText: {
    color: "#3355cc",
    fontSize: 14,
  },
  switchText: {
    color: "#3355cc",
    textAlign: "center",
    marginTop: 8,
  },
});
