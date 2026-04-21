/**
 * @module components/PlanBlockCard
 * Renders a single block in the daily study plan.
 * Shows position, course, title, due-date label, allocated time, and a focus CTA.
 */

import { Pressable, StyleSheet, Text, View } from "react-native";

// ── Urgency helpers ────────────────────────────────────────────────────────────

/**
 * Returns a human-readable due-date label and a color token based on the
 * assignment's urgency score. Mirrors the bands in computeUrgencyScore.
 */
function urgencyMeta(
  due_at: string | null,
  urgencyScore: number
): { label: string; color: string } {
  if (!due_at)            return { label: "No due date", color: "#aaa" };
  if (urgencyScore >= 1000) return { label: "Overdue",    color: "#b00020" };
  if (urgencyScore >= 500)  return { label: "Due today",  color: "#e65100" };
  if (urgencyScore >= 10)   return { label: "Due this week", color: "#1565c0" };
  return { label: "Due later", color: "#888" };
}

// ── Types ──────────────────────────────────────────────────────────────────────

/** Props consumed by PlanBlockCard. */
export type PlanBlockCardProps = {
  /** 1-based display position in the plan (shown in the badge). */
  position: number;
  /** Assignment title. */
  title: string;
  /** Course name, or null if the course couldn't be joined. */
  courseTitle: string | null;
  /** ISO-8601 due timestamp, or null for undated assignments. */
  due_at: string | null;
  /** Minutes allocated by the plan generator for this block. */
  allocatedMinutes: number;
  /** Urgency score from generateDailyPlan — drives the label and color. */
  urgencyScore: number;
  /** Called when the user taps the card body (navigates to AssignmentDetail). */
  onPress?: () => void;
  /** Called when the user taps "Start Focus". */
  onStartFocus: () => void;
};

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * PlanBlockCard displays one prioritised work block in the daily plan.
 *
 * Layout:
 * ┌───────────────────────────────────────────────┐
 * │ [N]  COURSE NAME              ◷ XX min        │
 * │      Assignment title                          │
 * │      Due label             [Start Focus]       │
 * └───────────────────────────────────────────────┘
 */
export function PlanBlockCard({
  position,
  title,
  courseTitle,
  due_at,
  allocatedMinutes,
  urgencyScore,
  onPress,
  onStartFocus,
}: PlanBlockCardProps) {
  const { label: dueLabel, color: dueColor } = urgencyMeta(due_at, urgencyScore);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Plan block ${position}: ${title}`}
    >
      <View style={styles.topRow}>
        {/* Position badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{position}</Text>
        </View>

        {/* Course label + time allocation */}
        <View style={styles.metaRight}>
          <Text style={styles.courseLabel} numberOfLines={1}>
            {courseTitle ?? "Unknown course"}
          </Text>
          <Text style={styles.timeLabel}>◷ {allocatedMinutes} min</Text>
        </View>
      </View>

      {/* Assignment title */}
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>

      {/* Bottom row: urgency label + CTA */}
      <View style={styles.bottomRow}>
        <Text style={[styles.dueLabel, { color: dueColor }]}>{dueLabel}</Text>
        <Pressable
          style={styles.focusButton}
          onPress={(e) => {
            e.stopPropagation();
            onStartFocus();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Start focus on ${title}`}
        >
          <Text style={styles.focusButtonText}>Start Focus</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e6",
    padding: 14,
    gap: 8,
  },
  cardPressed: {
    opacity: 0.7,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  badgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  metaRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  courseLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
    marginLeft: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    lineHeight: 20,
    marginLeft: 38, // align under meta, past the badge
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 38,
  },
  dueLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  focusButton: {
    backgroundColor: "#111",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  focusButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
