/**
 * @module screens/SettingsScreen
 * Allows the user to configure app-wide preferences.
 *
 * Currently exposes one setting:
 *   - Daily study budget (minutes) — overrides DEFAULT_DAILY_BUDGET_MINUTES in the Plan screen.
 *
 * On mount the screen loads the current saved value. On save it writes back
 * to the profiles table and updates PlanScreen on next focus via useFocusEffect there.
 */

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { getUserSettings, updateUserSettings, deleteAccount } from "../lib/api/settings";
import { supabase } from "../lib/supabase";
import { DEFAULT_DAILY_BUDGET_MINUTES } from "../../../../packages/domain/plan/generator";
import { parseBudgetInput } from "../../../../packages/domain/plan/budget";

// ── Types ──────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<any, "Settings">;

// ── Component ──────────────────────────────────────────────────────────────────

export function SettingsScreen({ navigation }: Props) {
  // Raw text value from the input; we parse to int only on save
  const [budgetText, setBudgetText] = useState("");
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Load existing settings on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const settings = await getUserSettings();
        if (!cancelled) {
          // Show the saved value, or the app default as placeholder if none saved yet
          setBudgetText(
            settings.daily_budget_minutes !== null
              ? String(settings.daily_budget_minutes)
              : ""
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load settings");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  /**
   * Validates the input via {@link parseBudgetInput} and persists the budget
   * to Supabase. A blank input clears the custom budget (reverts to app default).
   */
  const handleSave = useCallback(async () => {
    setError(null);

    const parsed = parseBudgetInput(budgetText);

    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    setSaving(true);
    try {
      await updateUserSettings({ daily_budget_minutes: parsed.value });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }, [budgetText, navigation]);

  /**
   * Shows a two-step confirmation dialog then calls the delete-account Edge
   * Function. On success, signs the user out — auth state change drives
   * navigation back to SignInScreen automatically.
   *
   * Two-step: first alert warns the user; second requires them to confirm
   * again with "Delete my account" to prevent accidental taps.
   */
  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete account?",
      "This will permanently erase your account, all courses, assignments, focus sessions, and uploaded syllabi. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "Your data cannot be recovered after deletion.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete my account",
                  style: "destructive",
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await deleteAccount();
                      // Session is now invalid — sign out locally to clear state.
                      await supabase.auth.signOut();
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "Account deletion failed. Please try again."
                      );
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, []);

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backButton}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Section: Study budget ── */}
          <Text style={styles.sectionLabel}>Study Budget</Text>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Daily budget (minutes)</Text>
            <Text style={styles.fieldHint}>
              How many minutes you want to study per day.{"\n"}
              Leave blank to use the app default ({DEFAULT_DAILY_BUDGET_MINUTES} min).
            </Text>

            <TextInput
              style={styles.input}
              value={budgetText}
              onChangeText={(t) => {
                setError(null);
                // Only allow digits
                setBudgetText(t.replace(/[^0-9]/g, ""));
              }}
              placeholder={String(DEFAULT_DAILY_BUDGET_MINUTES)}
              placeholderTextColor="#bbb"
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={4}
              accessibilityLabel="Daily budget in minutes"
            />
          </View>

          {/* ── Error banner ── */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Save button ── */}
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              (saving || pressed) && styles.saveButtonPressed,
            ]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Save settings"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </Pressable>

          {/* ── Section: Danger Zone ── */}
          <Text style={[styles.sectionLabel, styles.dangerLabel]}>Danger Zone</Text>

          <View style={[styles.card, styles.dangerCard]}>
            <Text style={styles.fieldLabel}>Delete account</Text>
            <Text style={styles.fieldHint}>
              Permanently erase your account and all data — courses, assignments,
              focus sessions, and uploaded syllabi. This cannot be undone.
            </Text>
            <Pressable
              style={[styles.deleteButton, deleting && styles.buttonDisabled]}
              onPress={handleDeleteAccount}
              disabled={deleting || saving}
              accessibilityRole="button"
              accessibilityLabel="Delete account"
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#b00020" />
              ) : (
                <Text style={styles.deleteButtonText}>Delete account</Text>
              )}
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e6",
    gap: 16,
  },
  backButton: {
    fontSize: 15,
    color: "#555",
    fontWeight: "500",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  content: {
    padding: 20,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e6",
    padding: 16,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  fieldHint: {
    fontSize: 12,
    color: "#888",
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d0d0d6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111",
    marginTop: 4,
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
  saveButton: {
    backgroundColor: "#111",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonPressed: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  dangerLabel: {
    color: "#b00020",
    marginTop: 16,
  },
  dangerCard: {
    borderColor: "#ffcdd2",
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: "#b00020",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: "#b00020",
    fontSize: 15,
    fontWeight: "600",
  },
});
