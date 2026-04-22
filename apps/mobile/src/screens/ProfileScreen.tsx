/**
 * @module screens/ProfileScreen
 * Personal home base: streak card, lifetime stats, settings + sign-out.
 * Accessible via the avatar button in Today's header.
 */

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { getProfileStats, type ProfileStats } from "../lib/api/profile";
import { Icons } from "../lib/icons";
import { C, F, R, shadow } from "../theme";

type Props = NativeStackScreenProps<any, "Profile">;

/**
 * Displays the user's avatar (email initial), streak badge, lifetime focus
 * stats, and account actions (Settings, Sign out).
 */
export function ProfileScreen({ navigation }: Props) {
  const [email, setEmail]     = useState<string | null>(null);
  const [stats, setStats]     = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ data: sessionData }, profileStats] = await Promise.all([
        supabase.auth.getSession(),
        getProfileStats(),
      ]);
      setEmail(sessionData.session?.user.email ?? null);
      setStats(profileStats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    // RootNavigator reacts to the auth state change — no explicit nav needed.
  }

  const initial = email?.[0]?.toUpperCase() ?? "?";

  const SettingsIcon = Icons.settings;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.indigo} />
      </View>
    );
  }

  const focusHours = stats ? (stats.totalFocusMinutes / 60).toFixed(1) : "0.0";

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button">
          <Icons.chevronDown size={24} color={C.textSub} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable
          onPress={() => navigation.navigate("Settings")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <SettingsIcon size={22} color={C.textSub} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.email} numberOfLines={1}>{email ?? "—"}</Text>
        </View>

        {/* Streak card */}
        <View style={[styles.card, styles.streakCard]}>
          <View style={styles.streakLeft}>
            <Text style={styles.streakNumber}>{stats?.streakDays ?? 0}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>🍋</Text>
          </View>
        </View>

        {/* Lifetime stats */}
        <View style={styles.statsRow}>
          <View style={[styles.card, styles.statCard]}>
            <Text style={styles.statNumber}>{focusHours}</Text>
            <Text style={styles.statLabel}>hours focused</Text>
          </View>
          <View style={[styles.card, styles.statCard]}>
            <Text style={styles.statNumber}>{stats?.totalCompleted ?? 0}</Text>
            <Text style={styles.statLabel}>assignments done</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Pressable
            style={[styles.actionRow, { borderTopWidth: 0 }]}
            onPress={() => navigation.navigate("Settings")}
            accessibilityRole="button"
          >
            <SettingsIcon size={18} color={C.textSub} />
            <Text style={styles.actionLabel}>Study budget & settings</Text>
            <Icons.chevronRight size={16} color={C.textMuted} />
          </Pressable>
        </View>

        {/* Sign out */}
        <Pressable
          style={[styles.signOutButton, signingOut && styles.buttonDisabled]}
          onPress={handleSignOut}
          disabled={signingOut}
          accessibilityRole="button"
        >
          {signingOut
            ? <ActivityIndicator color={C.error} size="small" />
            : <Text style={styles.signOutText}>Sign out</Text>
          }
        </Pressable>
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
    paddingBottom: 40,
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
    backgroundColor: C.indigo,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  avatarText: {
    fontSize: 30,
    fontFamily: F.bold,
    color: C.textInverse,
  },
  email: {
    fontSize: 15,
    fontFamily: F.medium,
    color: C.textSub,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 18,
    ...shadow.card,
  },
  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.indigoLight,
  },
  streakLeft: {
    gap: 2,
  },
  streakNumber: {
    fontSize: 48,
    fontFamily: F.xbold,
    color: C.indigo,
    lineHeight: 52,
  },
  streakLabel: {
    fontSize: 15,
    fontFamily: F.medium,
    color: C.indigo,
  },
  streakBadge: {
    width: 72,
    height: 72,
    borderRadius: R.full,
    backgroundColor: C.lemon,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  streakEmoji: {
    fontSize: 36,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statNumber: {
    fontSize: 36,
    fontFamily: F.xbold,
    color: C.text,
    lineHeight: 40,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: F.medium,
    color: C.textSub,
    textAlign: "center",
  },
  section: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    overflow: "hidden",
    ...shadow.card,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: F.medium,
    color: C.text,
  },
  signOutButton: {
    borderRadius: R.lg,
    borderWidth: 1.5,
    borderColor: C.error,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  signOutText: {
    color: C.error,
    fontSize: 15,
    fontFamily: F.bold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
