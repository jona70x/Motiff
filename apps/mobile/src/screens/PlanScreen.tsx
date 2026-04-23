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
import { completeAssignment } from "../lib/api/assignments";
import { generateDailyPlan, DEFAULT_DAILY_BUDGET_MINUTES, type PlanBlock } from "../../../../packages/domain/plan/generator";
import { AssignmentCard } from "../components/AssignmentCard";
import { analytics } from "../lib/analytics";
import { Icons } from "../lib/icons";
import { C, F, R, shadow } from "../theme";

// ── Types ──────────────────────────────────────────────────────────────────────

type Props = BottomTabScreenProps<any, "Plan">;

/**
 * A plan block enriched with the full assignment for rendering via AssignmentCard.
 * Avoids a second DB fetch by joining in memory after generation.
 */
type DisplayBlock = PlanBlock & {
  assignment: AssignmentWithCourse;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function enrichBlocks(
  blocks: PlanBlock[],
  assignments: AssignmentWithCourse[]
): DisplayBlock[] {
  const byId = new Map(assignments.map((a) => [a.id, a]));
  return blocks.map((b) => {
    const a = byId.get(b.assignmentId);
    // Fallback stub so AssignmentCard always gets a valid object
    const assignment: AssignmentWithCourse = a ?? {
      id:           b.assignmentId,
      course_id:    "",
      user_id:      "",
      title:        "Unknown assignment",
      due_at:       null,
      kind:         null,
      est_minutes:  null,
      completed_at: null,
      created_at:   "",
      course:       null,
    };
    return { ...b, assignment };
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PlanScreen({ navigation }: Props) {
  const [displayBlocks, setDisplayBlocks] = useState<DisplayBlock[]>([]);
  const [loading, setLoading]             = useState(true);
  const [regenerating, setRegenerating]   = useState(false);
  const [saveWarning, setSaveWarning]     = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [budgetMinutes, setBudgetMinutes] = useState(DEFAULT_DAILY_BUDGET_MINUTES);

  const isGenerating = useRef(false);

  const generate = useCallback(async (isRegen = false) => {
    if (isGenerating.current) return;
    isGenerating.current = true;

    if (isRegen) setRegenerating(true);
    else         setLoading(true);
    setSaveWarning(false);
    setError(null);

    try {
      const [settings, assignments] = await Promise.all([
        getUserSettings(),
        getTodayAssignments(),
      ]);

      const budget = settings.daily_budget_minutes ?? DEFAULT_DAILY_BUDGET_MINUTES;
      setBudgetMinutes(budget);

      const planInputs = assignments.map((a) => ({
        id:          a.id,
        title:       a.title,
        due_at:      a.due_at ?? null,
        est_minutes: a.est_minutes ?? null,
        course_id:   a.course_id,
      }));

      const blocks   = generateDailyPlan(planInputs, budget);
      const enriched = enrichBlocks(blocks, assignments);
      setDisplayBlocks(enriched);

      const eventProps = { blockCount: blocks.length, budgetMinutes: budget };
      if (isRegen) analytics.planRegenerated(eventProps);
      else         analytics.planScreenViewed(eventProps);

      saveDailyPlan(localDateString(), blocks).catch(() => setSaveWarning(true));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setLoading(false);
      setRegenerating(false);
      isGenerating.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => { generate(false); }, [generate])
  );

  const handleRegenerate = useCallback(() => generate(true), [generate]);

  const handleComplete = useCallback(async (assignmentId: string) => {
    try {
      await completeAssignment(assignmentId);
      generate(false);
    } catch (err) {
      console.error("Failed to complete assignment from plan:", err);
    }
  }, [generate]);

  const RefreshIcon  = Icons.refresh;
  const SettingsIcon = Icons.settings;

  if (loading && displayBlocks.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.indigo} />
      </View>
    );
  }

  const totalAllocated = displayBlocks.reduce((n, b) => n + b.allocatedMinutes, 0);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Plan</Text>
        </View>

        <View style={styles.headerRight}>
          <Pressable
            onPress={handleRegenerate}
            disabled={regenerating}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Regenerate plan"
          >
            {regenerating
              ? <ActivityIndicator size="small" color={C.indigo} />
              : <RefreshIcon size={20} color={C.textSub} />
            }
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("Settings")}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <SettingsIcon size={20} color={C.textSub} />
          </Pressable>
        </View>
      </View>

      {/* Indigo subheader pill */}
      {displayBlocks.length > 0 && (
        <View style={styles.subheaderRow}>
          <View style={styles.subheaderPill}>
            <Text style={styles.subheaderText}>
              {totalAllocated} min · {budgetMinutes} min budget
            </Text>
          </View>
        </View>
      )}

      {saveWarning && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            Plan generated but couldn't be saved — check your connection.
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => generate(false)} accessibilityRole="button">
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

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
        <FlatList
          data={displayBlocks}
          keyExtractor={(item) => item.assignmentId}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={regenerating} onRefresh={handleRegenerate} />
          }
          ListHeaderComponent={
            <Text style={styles.listSubheader}>Prioritised by urgency</Text>
          }
          renderItem={({ item }) => (
            <AssignmentCard
              assignment={item.assignment}
              allocatedMinutes={item.allocatedMinutes}
              onPress={() =>
                navigation.navigate("AssignmentDetail", { assignmentId: item.assignmentId })
              }
              onStartFocus={() =>
                navigation.navigate("FocusTimer", {
                  assignmentId: item.assignmentId,
                  title:        item.assignment.title,
                })
              }
              onComplete={() => handleComplete(item.assignmentId)}
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
  headerLeft: {
    gap: 2,
  },
  title: {
    fontSize: 28,
    fontFamily: F.display,
    color: C.ink,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  subheaderRow: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  subheaderPill: {
    alignSelf: "flex-start",
    backgroundColor: C.indigoLight,
    borderRadius: R.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  subheaderText: {
    fontSize: 12,
    fontFamily: F.bold,
    color: C.indigo,
  },
  listContent: {
    paddingVertical: 12,
    paddingBottom: 32,
  },
  listSubheader: {
    fontSize: 11,
    fontFamily: F.medium,
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  warningBanner: {
    backgroundColor: C.warningBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  warningText: {
    fontSize: 12,
    fontFamily: F.medium,
    color: C.warning,
  },
  errorBanner: {
    backgroundColor: C.errorBg,
    borderRadius: R.md,
    padding: 12,
    margin: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorText: {
    flex: 1,
    color: C.error,
    fontSize: 13,
    fontFamily: F.medium,
  },
  retryText: {
    color: C.error,
    fontSize: 13,
    fontFamily: F.bold,
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
    fontFamily: F.bold,
    color: C.text,
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: F.body,
    color: C.textSub,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  ctaButton: {
    backgroundColor: C.indigo,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: R.full,
  },
  ctaText: {
    color: C.textInverse,
    fontSize: 15,
    fontFamily: F.bold,
  },
});
