/**
 * @module screens/PlanScreen
 * Displays the user's auto-generated daily study plan.
 *
 * On every focus event the screen:
 *   1. Fetches user settings + today's uncompleted assignments (parallel).
 *   2. Resolves the daily budget (user value or DEFAULT_DAILY_BUDGET_MINUTES).
 *   3. Normalizes assignments to PlanInput shape.
 *   4. Runs generateDailyPlan (pure, in-memory) to produce ordered blocks.
 *   5. Enriches each block with its assignment/course data (already in memory).
 *   6. Renders the plan immediately — no wait for the DB save.
 *   7. Persists the plan to Supabase in the background (best-effort).
 *
 * The "Regenerate" button triggers the same flow on demand.
 */

import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { getTodayAssignments, type AssignmentWithCourse } from "../lib/api/today";
import { saveDailyPlan } from "../lib/api/plan";
import { getUserSettings } from "../lib/api/settings";
import { generateDailyPlan, DEFAULT_DAILY_BUDGET_MINUTES, type PlanBlock } from "../../../../packages/domain/plan/generator";
import { PlanBlockCard } from "../components/PlanBlockCard";
import { analytics } from "../lib/analytics";

// ── Types ──────────────────────────────────────────────────────────────────────

type Props = BottomTabScreenProps<any, "Plan">;

/**
 * A plan block enriched with display data from its parent assignment.
 * Avoids a second DB fetch by joining in memory after generation.
 */
type DisplayBlock = PlanBlock & {
  title: string;
  courseTitle: string | null;
  due_at: string | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Returns today's date as a YYYY-MM-DD string in local time.
 * Matches the convention used in the progress summary module.
 */
function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Joins generated PlanBlock[] with the source AssignmentWithCourse[] to produce
 * DisplayBlock[] ready for rendering. Runs entirely in memory.
 *
 * @param blocks      - Output of generateDailyPlan.
 * @param assignments - Source assignments used for generation.
 */
function enrichBlocks(
  blocks: PlanBlock[],
  assignments: AssignmentWithCourse[]
): DisplayBlock[] {
  const byId = new Map(assignments.map((a) => [a.id, a]));
  return blocks.map((b) => {
    const a = byId.get(b.assignmentId);
    return {
      ...b,
      title:       a?.title ?? "Unknown assignment",
      courseTitle: a?.course?.title ?? null,
      due_at:      a?.due_at ?? null,
    };
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PlanScreen({ navigation }: Props) {
  const [displayBlocks, setDisplayBlocks] = useState<DisplayBlock[]>([]);
  const [loading, setLoading]             = useState(true);
  const [regenerating, setRegenerating]   = useState(false);
  const [saveWarning, setSaveWarning]     = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  // Resolved budget: user's saved value or the app default
  const [budgetMinutes, setBudgetMinutes] = useState(DEFAULT_DAILY_BUDGET_MINUTES);

  // Prevent overlapping generate calls when the user rapidly switches tabs
  const isGenerating = useRef(false);

  /**
   * Core generation pipeline. Accepts a flag so callers can distinguish
   * the initial full-screen load from a user-initiated regenerate.
   *
   * @param isRegen - When true, uses the inline spinner instead of the full-screen loader.
   */
  const generate = useCallback(async (isRegen = false) => {
    if (isGenerating.current) return;
    isGenerating.current = true;

    if (isRegen) {
      setRegenerating(true);
    } else {
      setLoading(true);
    }
    setSaveWarning(false);
    setError(null);

    try {
      // 1. Fetch user settings and uncompleted assignments in parallel
      const [settings, assignments] = await Promise.all([
        getUserSettings(),
        getTodayAssignments(),
      ]);

      // 2. Resolve budget: prefer user's saved value, fall back to app default
      const budget = settings.daily_budget_minutes ?? DEFAULT_DAILY_BUDGET_MINUTES;
      setBudgetMinutes(budget);

      // 3. Normalize assignments to PlanInput (due_at: undefined → null)
      const planInputs = assignments.map((a) => ({
        id:          a.id,
        title:       a.title,
        due_at:      a.due_at ?? null,
        est_minutes: a.est_minutes ?? null,
        course_id:   a.course_id,
      }));

      // 4. Generate the plan in memory — pure, no I/O
      const blocks = generateDailyPlan(planInputs, budget);

      // 5. Enrich with display data and render immediately
      const enriched = enrichBlocks(blocks, assignments);
      setDisplayBlocks(enriched);

      // 6. Track analytics
      const eventProps = { blockCount: blocks.length, budgetMinutes: budget };
      if (isRegen) {
        analytics.planRegenerated(eventProps);
      } else {
        analytics.planScreenViewed(eventProps);
      }

      // 7. Persist to Supabase in the background — display does not wait for this
      saveDailyPlan(localDateString(), blocks).catch(() => {
        setSaveWarning(true);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setLoading(false);
      setRegenerating(false);
      isGenerating.current = false;
    }
  }, []);

  // Re-generate every time the screen comes into focus so the plan reflects
  // any assignments the user completed or added since the last visit.
  useFocusEffect(
    useCallback(() => {
      generate(false);
    }, [generate])
  );

  const handleRegenerate = useCallback(() => {
    generate(true);
  }, [generate]);

  // ── Full-screen loading state ─────────────────────────────────────────────

  if (loading && displayBlocks.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const totalAllocated = displayBlocks.reduce((n, b) => n + b.allocatedMinutes, 0);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Plan</Text>
          {displayBlocks.length > 0 && (
            <Text style={styles.subtitle}>
              {totalAllocated} min today
            </Text>
          )}
        </View>

        {/* Right-side controls: regenerate + settings */}
        <View style={styles.headerRight}>
          {/* Regenerate button — shows spinner when in flight */}
          <Pressable
            onPress={handleRegenerate}
            disabled={regenerating}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Regenerate plan"
          >
            {regenerating ? (
              <ActivityIndicator size="small" color="#111" />
            ) : (
              <Text style={styles.regenButton}>↺ Regenerate</Text>
            )}
          </Pressable>

          {/* Settings shortcut */}
          <Pressable
            onPress={() => navigation.navigate("Settings")}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Text style={styles.settingsButton}>⚙</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Non-blocking save warning ── */}
      {saveWarning && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            Plan generated but couldn't be saved — check your connection.
          </Text>
        </View>
      )}

      {/* ── Error state ── */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => generate(false)} accessibilityRole="button">
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* ── Empty state ── */}
      {displayBlocks.length === 0 && !loading && !error ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Nothing to plan</Text>
          <Text style={styles.emptyBody}>
            Add assignments to your courses and they'll appear here in priority order.
          </Text>
          <Pressable
            style={styles.ctaButton}
            onPress={() => navigation.navigate("Courses")}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>Go to Courses</Text>
          </Pressable>
        </View>
      ) : (
        /* ── Plan list ── */
        <FlatList
          data={displayBlocks}
          keyExtractor={(item) => item.assignmentId}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={regenerating} onRefresh={handleRegenerate} />
          }
          ListHeaderComponent={
            <Text style={styles.listHeader}>
              Prioritised by urgency · {budgetMinutes} min budget
            </Text>
          }
          renderItem={({ item }) => (
            <PlanBlockCard
              position={item.order + 1}
              title={item.title}
              courseTitle={item.courseTitle}
              due_at={item.due_at}
              allocatedMinutes={item.allocatedMinutes}
              urgencyScore={item.urgencyScore}
              onPress={() =>
                navigation.navigate("AssignmentDetail", { assignmentId: item.assignmentId })
              }
              onStartFocus={() =>
                navigation.navigate("FocusTimer", {
                  assignmentId: item.assignmentId,
                  title:        item.title,
                })
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f6f6f8",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e6",
  },
  headerLeft: {
    gap: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
  },
  subtitle: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  regenButton: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    paddingBottom: 2, // optical alignment with title baseline
  },
  settingsButton: {
    fontSize: 20,
    color: "#555",
    paddingBottom: 1,
  },
  listContent: {
    paddingVertical: 12,
    paddingBottom: 32,
  },
  listHeader: {
    fontSize: 11,
    color: "#aaa",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  warningBanner: {
    backgroundColor: "#fff8e1",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ffe082",
  },
  warningText: {
    fontSize: 12,
    color: "#795548",
  },
  errorBanner: {
    backgroundColor: "#ffebee",
    borderRadius: 8,
    padding: 12,
    margin: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorText: {
    flex: 1,
    color: "#b00020",
    fontSize: 13,
  },
  retryText: {
    color: "#b00020",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  emptyBody: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  ctaButton: {
    backgroundColor: "#111",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  ctaText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
