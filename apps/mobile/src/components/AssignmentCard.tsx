/**
 * @module components/AssignmentCard
 * S5-2 card design: gradient urgency rail, two-column layout (info left,
 * stacked action buttons right), pulsing rail for overdue items.
 */

import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Icons } from "../lib/icons";
import { formatRelativeDue, isOverdue, bucketAssignment } from "../lib/time";
import type { AssignmentWithCourse } from "../lib/api/today";
import { C, F, G, R, shadow } from "../theme";

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

// ── Urgency helpers ────────────────────────────────────────────────────────────

type Urgency = "overdue" | "today" | "week" | "later";

function getUrgency(dueAt: string | null | undefined): Urgency {
  if (isOverdue(dueAt)) return "overdue";
  const bucket = bucketAssignment(dueAt);
  if (bucket === "today")     return "today";
  if (bucket === "this_week") return "week";
  return "later";
}

const RAIL: Record<Urgency, [string, string]> = {
  overdue: G.railOverdue,
  today:   G.railToday,
  week:    G.railWeek,
  later:   G.railLater,
};

const PILL: Record<Urgency, { bg: string; text: string; dot: string }> = {
  overdue: { bg: C.pillOverdueBg, text: C.pillOverdueText, dot: C.pillOverdueDot },
  today:   { bg: C.pillTodayBg,   text: C.pillTodayText,   dot: C.pillTodayDot   },
  week:    { bg: C.pillWeekBg,    text: C.pillWeekText,     dot: C.pillWeekDot    },
  later:   { bg: C.pillLaterBg,   text: C.pillLaterText,    dot: C.pillLaterDot   },
};

const KIND_BADGE: Record<string, { bg: string; text: string }> = {
  exam:       { bg: C.badgeExamBg,   text: C.badgeExamText   },
  assignment: { bg: C.badgeAssignBg, text: C.badgeAssignText },
  project:    { bg: C.badgeProjBg,   text: C.badgeProjText   },
  reading:    { bg: C.badgeReadBg,   text: C.badgeReadText   },
};

// ── Types ──────────────────────────────────────────────────────────────────────

type Props = {
  assignment: AssignmentWithCourse;
  /** Minutes already focused on this assignment; renders a progress bar when > 0. */
  focusedMinutes?: number;
  /** Override time label (e.g. plan-allocated minutes) when est_minutes is absent. */
  allocatedMinutes?: number;
  onPress?: () => void;
  onStartFocus: () => void;
  onComplete: () => void;
  /** When provided, a delete button appears in the action column. */
  onDelete?: () => void;
};

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * AssignmentCard renders one to-do item with an urgency rail, two-column layout
 * (text info on the left, stacked action buttons on the right), and an optional
 * pulsing animation on the rail for overdue items.
 */
export function AssignmentCard({
  assignment,
  focusedMinutes = 0,
  allocatedMinutes,
  onPress,
  onStartFocus,
  onComplete,
  onDelete,
}: Props) {
  const courseTitle = assignment.course?.title ?? "Unknown course";
  const relativeDue = formatRelativeDue(assignment.due_at);
  const urgency     = getUrgency(assignment.due_at);
  const pillStyle   = PILL[urgency];
  const railColors  = RAIL[urgency];
  const badgeStyle  = assignment.kind
    ? (KIND_BADGE[assignment.kind.toLowerCase()] ?? null)
    : null;
  const est         = assignment.est_minutes ?? null;
  const timeLabel   = est !== null ? est : (allocatedMinutes ?? null);

  const showProgress = focusedMinutes > 0 && est !== null && est > 0;
  const progress     = showProgress ? Math.min(focusedMinutes / est, 1) : 0;

  // Pulsing opacity on the urgency rail for overdue items
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (urgency !== "overdue") {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 550, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 550, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [urgency, pulseAnim]);

  const CheckIcon = Icons.check;
  const PlayIcon  = Icons.play;
  const ClockIcon = Icons.clock;
  const TrashIcon = Icons.trash;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={assignment.title}
    >
      {/* Gradient urgency rail — animates opacity for overdue items */}
      <AnimatedGradient
        colors={railColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.rail, { opacity: pulseAnim }]}
      />

      {/* Card body: left info + right button column */}
      <View style={styles.content}>

        {/* ── Left: text info ── */}
        <View style={styles.left}>

          {/* Course label + kind badge */}
          <View style={styles.courseRow}>
            <Text style={styles.courseLabel} numberOfLines={1}>{courseTitle}</Text>
            {badgeStyle && assignment.kind ? (
              <View style={[styles.kindBadge, { backgroundColor: badgeStyle.bg }]}>
                <Text style={[styles.kindText, { color: badgeStyle.text }]}>
                  {assignment.kind.toLowerCase()}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Assignment title */}
          <Text style={styles.title} numberOfLines={3}>{assignment.title}</Text>

          {/* Due pill */}
          <View style={[styles.pill, { backgroundColor: pillStyle.bg }]}>
            <View style={[styles.dot, { backgroundColor: pillStyle.dot }]} />
            <Text style={[styles.pillText, { color: pillStyle.text }]}>{relativeDue}</Text>
          </View>

          {/* Time estimate */}
          {timeLabel !== null && (
            <View style={styles.estRow}>
              <ClockIcon size={10} color={C.timeText} />
              <Text style={styles.est}>{timeLabel} min est.</Text>
            </View>
          )}

          {/* Focus progress bar */}
          {showProgress && (
            <View style={styles.progBlock}>
              <View style={styles.progTrack}>
                <LinearGradient
                  colors={G.progFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progFill, { width: `${Math.round(progress * 100)}%` as any }]}
                />
              </View>
              <View style={styles.progNote}>
                <Text style={styles.progNoteText}>{focusedMinutes}/{est} min</Text>
                <Text style={styles.progNoteText}>{Math.round(progress * 100)}%</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Right: stacked action buttons ── */}
        <View style={styles.right}>
          {/* Start Focus */}
          <Pressable
            hitSlop={4}
            onPress={(e) => { e.stopPropagation(); onStartFocus(); }}
            accessibilityRole="button"
            accessibilityLabel="Start Focus"
          >
            <LinearGradient
              colors={G.focusPeach}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.focusButton, shadow.focusBtn]}
            >
              <PlayIcon size={9} color={C.textInverse} fill={C.textInverse} />
              <Text style={styles.focusButtonText}>Start Focus</Text>
            </LinearGradient>
          </Pressable>

          {/* Done circle */}
          <Pressable
            style={styles.doneButton}
            hitSlop={8}
            onPress={(e) => { e.stopPropagation(); onComplete(); }}
            accessibilityRole="button"
            accessibilityLabel="Mark done"
          >
            <CheckIcon size={15} color={C.mintCheck} strokeWidth={2.5} />
          </Pressable>

          {/* Delete (optional) */}
          {onDelete && (
            <Pressable
              style={styles.deleteButton}
              hitSlop={8}
              onPress={(e) => { e.stopPropagation(); onDelete(); }}
              accessibilityRole="button"
              accessibilityLabel="Delete assignment"
            >
              <TrashIcon size={14} color={C.error} strokeWidth={2} />
            </Pressable>
          )}
        </View>

      </View>
    </Pressable>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flexDirection:    "row",
    backgroundColor:  C.surface,
    marginHorizontal: 16,
    marginVertical:   4,
    borderRadius:     18,
    borderWidth:      1,
    borderColor:      C.cardBorder,
    overflow:         "hidden",
    ...shadow.s5card,
  },
  cardPressed: {
    opacity: 0.75,
  },
  rail: {
    width:     5,
    flexShrink: 0,
  },
  // Two-column content area
  content: {
    flex:          1,
    flexDirection: "row",
    paddingTop:    10,
    paddingBottom: 10,
    paddingLeft:   12,
    paddingRight:  10,
    gap:           10,
  },
  // Left column: text info
  left: {
    flex: 1,
    gap:  5,
  },
  courseRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  courseLabel: {
    flex:          1,
    fontSize:      10,
    fontFamily:    F.xbold,
    color:         C.brand,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  kindBadge: {
    borderRadius:      R.full,
    paddingVertical:   2,
    paddingHorizontal: 7,
    flexShrink:        0,
  },
  kindText: {
    fontSize:      9,
    fontFamily:    F.xbold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontFamily:    F.display,
    fontSize:      15,
    color:         C.ink,
    lineHeight:    19,
    letterSpacing: -0.2,
  },
  pill: {
    flexDirection:  "row",
    alignItems:     "center",
    alignSelf:      "flex-start",
    gap:            5,
    borderRadius:   R.full,
    paddingVertical: 3,
    paddingLeft:    7,
    paddingRight:   9,
  },
  dot: {
    width:        6,
    height:       6,
    borderRadius: R.full,
    flexShrink:   0,
  },
  pillText: {
    fontSize:      10,
    fontFamily:    F.xbold,
    letterSpacing: -0.05,
  },
  estRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           4,
  },
  est: {
    fontSize:   10,
    fontFamily: F.bold,
    color:      C.timeText,
  },
  progBlock: {
    gap: 3,
  },
  progTrack: {
    height:          3,
    borderRadius:    3,
    backgroundColor: C.chipBg,
    overflow:        "hidden",
  },
  progFill: {
    height:       3,
    borderRadius: 3,
  },
  progNote: {
    flexDirection:  "row",
    justifyContent: "space-between",
  },
  progNoteText: {
    fontSize:      9,
    fontFamily:    F.xbold,
    color:         C.progNote,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Right column: stacked buttons
  right: {
    alignItems:     "center",
    justifyContent: "center",
    gap:            6,
  },
  focusButton: {
    borderRadius:      10,
    paddingVertical:   8,
    paddingHorizontal: 10,
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
  },
  focusButtonText: {
    color:     C.textInverse,
    fontSize:  11,
    fontFamily: F.xbold,
  },
  doneButton: {
    width:           30,
    height:          30,
    borderRadius:    R.full,
    backgroundColor: C.surface,
    borderWidth:     2,
    borderColor:     C.doneBorder,
    alignItems:      "center",
    justifyContent:  "center",
  },
  deleteButton: {
    width:           26,
    height:          26,
    borderRadius:    R.full,
    alignItems:      "center",
    justifyContent:  "center",
  },
});
