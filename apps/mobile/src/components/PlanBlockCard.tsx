/**
 * @module components/PlanBlockCard
 * Renders a single block in the daily study plan.
 * Shows position, course, title, due-date label, allocated time, and a focus CTA.
 */

import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icons } from "../lib/icons";
import { C, F, R, shadow } from "../theme";

// ── Urgency helpers ────────────────────────────────────────────────────────────

function urgencyMeta(
  due_at: string | null,
  urgencyScore: number
): { label: string; color: string; railColor: string } {
  if (!due_at)              return { label: "No due date",  color: C.textMuted, railColor: C.railLater  };
  if (urgencyScore >= 1000) return { label: "Overdue",      color: C.error,     railColor: C.railOverdue };
  if (urgencyScore >= 500)  return { label: "Due today",    color: C.warning,   railColor: C.railToday  };
  if (urgencyScore >= 10)   return { label: "Due this week",color: C.indigo,    railColor: C.railWeek   };
  return                           { label: "Due later",    color: C.textMuted, railColor: C.railLater  };
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
 * ┌────────────────────────────────────────────────┐
 * │ rail │ [N]  COURSE NAME          ◷ XX min      │
 * │      │      Assignment title                    │
 * │      │      Due label         [Start Focus]     │
 * └────────────────────────────────────────────────┘
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
  const { label: dueLabel, color: dueColor, railColor } = urgencyMeta(due_at, urgencyScore);
  const ClockIcon = Icons.clock;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Plan block ${position}: ${title}`}
    >
      {/* Urgency color rail */}
      <View style={[styles.rail, { backgroundColor: railColor }]} />

      <View style={styles.content}>
        {/* Top row: position badge + course + time */}
        <View style={styles.topRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{position}</Text>
          </View>
          <Text style={styles.courseLabel} numberOfLines={1}>
            {courseTitle ?? "Unknown course"}
          </Text>
          <View style={styles.timeChip}>
            <ClockIcon size={11} color={C.textSub} />
            <Text style={styles.timeLabel}>{allocatedMinutes} min</Text>
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
            onPress={(e) => { e.stopPropagation(); onStartFocus(); }}
            accessibilityRole="button"
            accessibilityLabel={`Start focus on ${title}`}
          >
            <Text style={styles.focusButtonText}>Start Focus</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: R.lg,
    flexDirection: "row",
    overflow: "hidden",
    ...shadow.card,
  },
  cardPressed: {
    opacity: 0.75,
  },
  rail: {
    width: 4,
    flexShrink: 0,
  },
  content: {
    flex: 1,
    padding: 13,
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: R.full,
    backgroundColor: C.indigo,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  badgeText: {
    color: C.textInverse,
    fontSize: 12,
    fontFamily: F.bold,
  },
  courseLabel: {
    flex: 1,
    fontSize: 11,
    fontFamily: F.medium,
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.borderLight,
    borderRadius: R.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  timeLabel: {
    fontSize: 11,
    fontFamily: F.medium,
    color: C.textSub,
  },
  title: {
    fontSize: 15,
    fontFamily: F.bold,
    color: C.text,
    lineHeight: 20,
    marginLeft: 34, // align under course label, past the badge
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 34,
  },
  dueLabel: {
    fontSize: 12,
    fontFamily: F.medium,
  },
  focusButton: {
    backgroundColor: C.peach,
    borderRadius: R.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  focusButtonText: {
    color: C.peachText,
    fontSize: 12,
    fontFamily: F.bold,
  },
});
