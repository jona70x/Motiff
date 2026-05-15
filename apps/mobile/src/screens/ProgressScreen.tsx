import { useCallback, useMemo, useState } from "react";
import { C, F, R } from "../theme";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { getWeekSessions, getWeekCompletions } from "../lib/api/progress";
import { buildWeekSummary } from "../../../../packages/domain/progress/summary";
import { WeekBarChart } from "../components/WeekBarChart";
import { analytics } from "../lib/analytics";
import type { SessionRecord, CompletionRecord } from "../../../../packages/domain/progress/summary";

type Props = BottomTabScreenProps<any, "Progress">;

export function ProgressScreen({ navigation }: Props) {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [completions, setCompletions] = useState<CompletionRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [sessionData, completionData] = await Promise.all([
        getWeekSessions(),
        getWeekCompletions(),
      ]);
      setSessions(sessionData);
      setCompletions(completionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load progress");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
      analytics.progressScreenViewed();
    }, [load])
  );

  const summary = useMemo(() => buildWeekSummary(sessions, completions), [sessions, completions]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading && sessions.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const hasData = sessions.length > 0;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
      </View>

      <ScrollView
        contentContainerStyle={!hasData ? styles.emptyContainer : styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!hasData ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No focus sessions yet</Text>
            <Text style={styles.emptySubtext}>
              Start a focus session from Today to see your progress here.
            </Text>
            <Pressable
              style={styles.ctaButton}
              onPress={() => navigation.navigate("Today")}
              accessibilityRole="button"
            >
              <Text style={styles.ctaText}>Go to Today</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Weekly bar chart */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>This week</Text>
              <WeekBarChart days={summary.days} />
              <Text style={styles.totalMinutes}>
                {summary.totalMinutes} min focused this week
              </Text>
            </View>

            {/* Completion summary — populated by S2-4 */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Assignments</Text>
              <Text style={styles.statNumber}>
                {summary.courseSummaries.reduce((n, c) => n + c.assignmentsCompleted, 0)}
              </Text>
              <Text style={styles.statCaption}>completed this week</Text>
            </View>

            {/* Per-course breakdown */}
            {summary.courseSummaries.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>By course</Text>
                {summary.courseSummaries.map((c) => (
                  <View key={c.courseId} style={styles.courseRow}>
                    <Text style={styles.courseTitle} numberOfLines={1}>
                      {c.courseTitle}
                    </Text>
                    <Text style={styles.courseMinutes}>{c.minutesFocused} min</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    fontSize: 28,
    fontFamily: F.display,
    color: C.ink,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 32,
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: F.bold,
    color: C.text,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: F.body,
    color: C.textSub,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: C.ink,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: R.md,
  },
  ctaText: {
    color: C.textInverse,
    fontSize: 15,
    fontFamily: F.bold,
  },
  errorBanner: {
    backgroundColor: C.errorBg,
    borderRadius: R.md,
    padding: 12,
    marginBottom: 4,
  },
  errorText: {
    color: C.error,
    fontSize: 13,
    fontFamily: F.medium,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 4,
  },
  cardLabel: {
    fontSize: 12,
    fontFamily: F.bold,
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  totalMinutes: {
    fontSize: 13,
    fontFamily: F.body,
    color: C.textSub,
    marginTop: 4,
  },
  statNumber: {
    fontSize: 36,
    fontFamily: F.bold,
    color: C.text,
  },
  statCaption: {
    fontSize: 13,
    fontFamily: F.body,
    color: C.textMuted,
  },
  courseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  courseTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: F.medium,
    color: C.text,
  },
  courseMinutes: {
    fontSize: 14,
    fontFamily: F.bold,
    color: C.textSub,
  },
});
