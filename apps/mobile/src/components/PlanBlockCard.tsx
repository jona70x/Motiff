/**
 * @module components/PlanBlockCard
 * S5-2 card design: gradient position badge, Bricolage title with 48px indent,
 * urgency-matched due pill, gradient Start Focus button. No urgency rail.
 */

import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Icons } from "../lib/icons";
import { C, F, G, R, shadow } from "../theme";

// ── Urgency helpers ────────────────────────────────────────────────────────────

type Urgency = "overdue" | "today" | "week" | "later";

function getUrgency(due_at: string | null, urgencyScore: number): Urgency {
  if (!due_at)              return "later";
  if (urgencyScore >= 1000) return "overdue";
  if (urgencyScore >= 500)  return "today";
  if (urgencyScore >= 10)   return "week";
  return "later";
}

const PILL: Record<Urgency, { bg: string; text: string; dot: string; label: string }> = {
  overdue: { bg: C.pillOverdueBg, text: C.pillOverdueText, dot: C.pillOverdueDot, label: "Overdue"       },
  today:   { bg: C.pillTodayBg,   text: C.pillTodayText,   dot: C.pillTodayDot,   label: "Due today"     },
  week:    { bg: C.pillWeekBg,    text: C.pillWeekText,     dot: C.pillWeekDot,    label: "Due this week" },
  later:   { bg: C.pillLaterBg,   text: C.pillLaterText,    dot: C.pillLaterDot,   label: "Due later"     },
};

// ── Types ──────────────────────────────────────────────────────────────────────

/** Props consumed by PlanBlockCard. */
export type PlanBlockCardProps = {
  /** 1-based display position in the plan (shown in the gradient badge). */
  position: number;
  /** Assignment title. */
  title: string;
  /** Course name, or null if the course couldn't be joined. */
  courseTitle: string | null;
  /** ISO-8601 due timestamp, or null for undated assignments. */
  due_at: string | null;
  /** Minutes allocated by the plan generator for this block. */
  allocatedMinutes: number;
  /** Urgency score from generateDailyPlan — drives the due pill color. */
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
 * ┌──────────────────────────────────────────────────┐
 * │  [N]   COURSE NAME                   ◷ XX min   │
 * │        Assignment title (Bricolage, indent 48px) │
 * │        Due pill               [Start Focus]      │
 * └──────────────────────────────────────────────────┘
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
  const urgency   = getUrgency(due_at, urgencyScore);
  const pill      = PILL[urgency];
  const PlayIcon  = Icons.play;
  const ClockIcon = Icons.clock;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Plan block ${position}: ${title}`}
    >
      {/* Top row: position badge + course label + time chip */}
      <View style={styles.topRow}>
        <LinearGradient
          colors={G.posBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.posBadge, shadow.posBadge]}
        >
          <Text style={styles.posText}>{position}</Text>
        </LinearGradient>

        <View style={styles.topMid}>
          <Text style={styles.courseLabel} numberOfLines={1}>
            {courseTitle ?? "Unknown course"}
          </Text>
          <View style={styles.timeChip}>
            <ClockIcon size={11} color={C.timeText} />
            <Text style={styles.timeText}>{allocatedMinutes} min</Text>
          </View>
        </View>
      </View>

      {/* Assignment title — Bricolage Grotesque, indented past badge */}
      <Text style={styles.title} numberOfLines={3}>{title}</Text>

      {/* Bottom row: due pill + CTA — same indent as title */}
      <View style={styles.bottomRow}>
        {due_at ? (
          <View style={[styles.pill, { backgroundColor: pill.bg }]}>
            <View style={[styles.dot, { backgroundColor: pill.dot }]} />
            <Text style={[styles.pillText, { color: pill.text }]}>{pill.label}</Text>
          </View>
        ) : (
          <View />
        )}

        <Pressable
          onPress={(e) => { e.stopPropagation(); onStartFocus(); }}
          accessibilityRole="button"
          accessibilityLabel={`Start focus on ${title}`}
        >
          <LinearGradient
            colors={G.focusPeach}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.focusButton, shadow.focusBtn]}
          >
            <PlayIcon size={10} color="#fff" fill="#fff" />
            <Text style={styles.focusButtonText}>Start Focus</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor:  C.surface,
    marginHorizontal: 16,
    marginVertical:   5,
    borderRadius:     18,
    borderWidth:      1,
    borderColor:      C.cardBorder,
    padding:          14,
    gap:              8,
    ...shadow.s5card,
  },
  cardPressed: {
    opacity: 0.75,
  },
  topRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           12,
  },
  posBadge: {
    width:           36,
    height:          36,
    borderRadius:    R.full,
    alignItems:      "center",
    justifyContent:  "center",
    flexShrink:      0,
  },
  posText: {
    fontFamily: F.display,
    fontSize:   16,
    color:      C.textInverse,
  },
  topMid: {
    flex:           1,
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    gap:            8,
  },
  courseLabel: {
    flex:          1,
    fontSize:      11,
    fontFamily:    F.xbold,
    color:         C.brand,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  timeChip: {
    flexDirection:     "row",
    alignItems:        "center",
    backgroundColor:   C.chipBg,
    borderRadius:      R.full,
    paddingVertical:   4,
    paddingHorizontal: 10,
  },
  timeText: {
    fontSize:   12,
    fontFamily: F.xbold,
    color:      C.timeText,
    marginLeft: 4,
  },
  // Title indented 48px = 36px badge + 12px gap
  title: {
    fontFamily:    F.display,
    fontSize:      18,
    color:         C.ink,
    lineHeight:    22,
    letterSpacing: -0.25,
    marginLeft:    48,
  },
  bottomRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    marginLeft:     48,
    gap:            8,
  },
  pill: {
    flexDirection:    "row",
    alignItems:       "center",
    gap:              6,
    borderRadius:     R.full,
    paddingVertical:  4,
    paddingLeft:      8,
    paddingRight:     10,
  },
  dot: {
    width:        7,
    height:       7,
    borderRadius: R.full,
    flexShrink:   0,
  },
  pillText: {
    fontSize:      12,
    fontFamily:    F.xbold,
    letterSpacing: -0.05,
  },
  focusButton: {
    borderRadius:      12,
    paddingVertical:   10,
    paddingHorizontal: 16,
    flexDirection:     "row",
    alignItems:        "center",
  },
  focusButtonText: {
    color:         C.textInverse,
    fontSize:      13,
    fontFamily:    F.xbold,
    letterSpacing: -0.05,
    marginLeft:    5,
  },
});
