/**
 * @module screens/ProfileScreen
 * Personal home base: gradient avatar, streak card, lifetime stats,
 * per-course semester breakdown, settings shortcuts, and account controls.
 * Accessible via the avatar button in Today's header.
 */

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { deleteAccount } from "../lib/api/settings";
import { getWeekSessions, getWeekCompletions } from "../lib/api/progress";
import { buildWeekSummary } from "../../../../packages/domain/progress/summary";
import type { SessionRecord, CompletionRecord } from "../../../../packages/domain/progress/summary";
import { useLifetimeStats } from "../hooks/useLifetimeStats";
import { useStreak } from "../hooks/useStreak";
import { Icons } from "../lib/icons";
import { C, F, R, shadow } from "../theme";

type Props = NativeStackScreenProps<any, "Profile">;

type CourseSummaryRow = {
  courseId: string;
  courseTitle: string;
  minutesFocused: number;
  assignmentsCompleted: number;
};

/** Formats a minute count as "Xh Ym", "Xh", or "Ym". */
function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function streakSubtext(days: number): string {
  return days >= 7 ? "Great work!" : "Keep it going";
}

/**
 * Shows the user's profile: avatar, streak, lifetime stats,
 * semester course breakdown, settings shortcuts, and account actions.
 */
export function ProfileScreen({ navigation }: Props) {
  const { stats: lifetimeStats, loading: statsLoading, reload: reloadStats } = useLifetimeStats();
  const { streakDays, loading: streakLoading, reload: reloadStreak }        = useStreak();

  const [email, setEmail]                     = useState<string | null>(null);
  const [courseSummaries, setCourseSummaries] = useState<CourseSummaryRow[]>([]);
  const [dataLoading, setDataLoading]         = useState(true);
  const [loadError, setLoadError]             = useState(false);
  const [signingOut, setSigningOut]           = useState(false);
  const [deleting, setDeleting]               = useState(false);

  const loadSessionData = useCallback(async () => {
    setDataLoading(true);
    setLoadError(false);
    try {
      const [{ data: sessionData }, sessionRecs, completionRecs] = await Promise.all([
        supabase.auth.getSession(),
        getWeekSessions() as Promise<SessionRecord[]>,
        getWeekCompletions() as Promise<CompletionRecord[]>,
      ]);
      setEmail(sessionData.session?.user.email ?? null);
      const summary = buildWeekSummary(sessionRecs, completionRecs);
      setCourseSummaries(summary.courseSummaries);
    } catch {
      setLoadError(true);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadSessionData(); }, [loadSessionData]);

  const isLoading = statsLoading || streakLoading || dataLoading;

  const handleSignOut = useCallback(() => {
    Alert.alert(
      "Sign out?",
      "You'll need to sign back in to access your account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            setSigningOut(true);
            await supabase.auth.signOut();
            // RootNavigator reacts to auth state change automatically.
          },
        },
      ]
    );
  }, []);

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
                      await supabase.auth.signOut();
                    } catch (err) {
                      Alert.alert(
                        "Deletion failed",
                        err instanceof Error ? err.message : "Please try again."
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

  const handleChangePassword = useCallback(async () => {
    if (!email) return;
    try {
      await supabase.auth.resetPasswordForEmail(email);
      Alert.alert("Check your email", `We sent a password reset link to ${email}.`);
    } catch {
      Alert.alert("Error", "Could not send reset email. Please try again.");
    }
  }, [email]);

  const initial = email?.[0]?.toUpperCase() ?? "M";

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.indigo} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load profile.</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => { loadSessionData(); reloadStats(); reloadStreak(); }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icons.chevronLeft size={24} color={C.textSub} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable
          onPress={() => navigation.navigate("Settings")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Icons.settings size={22} color={C.textSub} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <LinearGradient
            colors={["#7a5cff", "#5b3df5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initial}</Text>
          </LinearGradient>
          <Text style={styles.email} numberOfLines={1}>{email ?? "—"}</Text>
        </View>

        {/* Streak card */}
        <View style={styles.streakCard}>
          {streakDays === 0 ? (
            <Text style={styles.streakZeroText}>Start your first focus session</Text>
          ) : (
            <>
              <View style={styles.streakLeft}>
                <Text style={styles.streakValue}>✦ {streakDays}-day streak</Text>
              </View>
              <Text style={styles.streakSubtext}>{streakSubtext(streakDays)}</Text>
            </>
          )}
        </View>

        {/* Lifetime stats */}
        <View style={styles.statsRow}>
          <View style={[styles.card, styles.statCard]}>
            <Text style={styles.statNumber}>
              {lifetimeStats ? formatMinutes(lifetimeStats.totalMinutes) : "—"}
            </Text>
            <Text style={styles.statLabel}>TOTAL FOCUSED</Text>
          </View>
          <View style={[styles.card, styles.statCard]}>
            <Text style={styles.statNumber}>
              {lifetimeStats ? String(lifetimeStats.completedCount) : "—"}
            </Text>
            <Text style={styles.statLabel}>COMPLETED</Text>
          </View>
        </View>

        {/* This week — per-course breakdown */}
        {courseSummaries.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>This week</Text>
            {courseSummaries.map((c, i) => (
              <View
                key={c.courseId}
                style={[styles.courseRow, i === 0 && styles.courseRowFirst]}
              >
                <Text style={styles.courseTitle} numberOfLines={1}>{c.courseTitle}</Text>
                <Text style={styles.courseMinutes}>{c.minutesFocused} min</Text>
              </View>
            ))}
          </View>
        )}

        {/* Settings section */}
        <Text style={styles.groupLabel}>Settings</Text>
        <View style={styles.card}>
          <Pressable
            style={[styles.actionRow, styles.actionRowFirst]}
            onPress={() => navigation.navigate("Settings")}
            accessibilityRole="button"
          >
            <Icons.settings size={18} color={C.textSub} />
            <Text style={styles.actionLabel}>Daily budget</Text>
            <Icons.chevronRight size={16} color={C.textMuted} />
          </Pressable>
          <Pressable
            style={styles.actionRow}
            onPress={() => Linking.openSettings()}
            accessibilityRole="button"
          >
            <Icons.bell size={18} color={C.textSub} />
            <Text style={styles.actionLabel}>Notifications</Text>
            <Icons.chevronRight size={16} color={C.textMuted} />
          </Pressable>
        </View>

        {/* Account section */}
        <Text style={styles.groupLabel}>Account</Text>
        <View style={styles.card}>
          <Pressable
            style={[styles.actionRow, styles.actionRowFirst]}
            onPress={handleChangePassword}
            accessibilityRole="button"
          >
            <Icons.lock size={18} color={C.textSub} />
            <Text style={styles.actionLabel}>Change password</Text>
            <Icons.chevronRight size={16} color={C.textMuted} />
          </Pressable>
          <Pressable
            style={styles.actionRow}
            onPress={handleSignOut}
            disabled={signingOut}
            accessibilityRole="button"
          >
            <Icons.logOut size={18} color={C.textSub} />
            {signingOut
              ? <ActivityIndicator size="small" color={C.textSub} style={{ flex: 1 }} />
              : <Text style={styles.actionLabel}>Sign out</Text>
            }
          </Pressable>
          <Pressable
            style={styles.actionRow}
            onPress={handleDeleteAccount}
            disabled={deleting}
            accessibilityRole="button"
          >
            <Icons.trash size={18} color={C.error} />
            {deleting
              ? <ActivityIndicator size="small" color={C.error} style={{ flex: 1 }} />
              : <Text style={[styles.actionLabel, styles.destructiveLabel]}>Delete account</Text>
            }
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: F.bold,
    color: C.text,
  },
  scroll: {
    padding: 20,
    gap: 14,
    paddingBottom: 48,
  },
  avatarSection: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: R.full,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: F.bold,
    fontWeight: "800",
    color: "#ffffff",
  },
  email: {
    fontSize: 14,
    fontFamily: F.medium,
    color: C.textSub,
  },
  streakCard: {
    backgroundColor: "#1a1633",
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 80,
  },
  streakLeft: {
    flex: 1,
  },
  streakValue: {
    fontSize: 24,
    fontFamily: F.display,
    color: C.lemon,
  },
  streakSubtext: {
    fontSize: 12,
    fontFamily: F.medium,
    color: "#9793b8",
  },
  streakZeroText: {
    fontSize: 14,
    fontFamily: F.medium,
    color: "#6b6690",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 18,
    ...shadow.card,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statNumber: {
    fontSize: 28,
    fontFamily: F.display,
    fontWeight: "800",
    color: "#1a1633",
    lineHeight: 32,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: F.medium,
    color: C.textSub,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: F.medium,
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  courseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  courseRowFirst: {
    marginTop: 4,
  },
  courseTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: F.medium,
    color: C.text,
    paddingRight: 8,
  },
  courseMinutes: {
    fontSize: 14,
    fontFamily: F.bold,
    color: C.textSub,
  },
  groupLabel: {
    fontSize: 11,
    fontFamily: F.medium,
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: -4,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 2,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  actionRowFirst: {
    borderTopWidth: 0,
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: F.medium,
    color: C.text,
  },
  destructiveLabel: {
    color: C.error,
  },
  errorText: {
    fontSize: 15,
    fontFamily: F.medium,
    color: C.textSub,
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: C.indigo,
    borderRadius: R.lg,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: F.bold,
  },
});
