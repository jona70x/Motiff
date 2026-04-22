/**
 * @module components/AssignmentCard
 * S5-2 card design: gradient urgency rail, Bricolage title, urgency-matched
 * due pill, optional focus progress bar, gradient Start Focus button.
 */

import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Icons } from "../lib/icons";
import { formatRelativeDue, isOverdue, bucketAssignment } from "../lib/time";
import type { AssignmentWithCourse } from "../lib/api/today";
import { C, F, G, R, shadow } from "../theme";

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
  onPress?: () => void;
  onStartFocus: () => void;
  onComplete: () => void;
};

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * AssignmentCard renders one to-do item with an urgency rail, due-date pill,
 * optional focus progress bar, and action buttons.
 */
export function AssignmentCard({
  assignment,
  focusedMinutes = 0,
  onPress,
  onStartFocus,
  onComplete,
}: Props) {
  const courseTitle  = assignment.course?.title ?? "Unknown course";
  const relativeDue  = formatRelativeDue(assignment.due_at);
  const urgency      = getUrgency(assignment.due_at);
  const pillStyle    = PILL[urgency];
  const railColors   = RAIL[urgency];
  const badgeStyle   = assignment.kind
    ? (KIND_BADGE[assignment.kind.toLowerCase()] ?? null)
    : null;
  const est          = assignment.est_minutes ?? null;

  const showProgress = focusedMinutes > 0 && est !== null && est > 0;
  const progress     = showProgress ? Math.min(focusedMinutes / est!, 1) : 0;

  const CheckIcon = Icons.check;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={assignment.title}
    >
      {/* Gradient urgency rail — sibling to content, clipped by card overflow:hidden */}
      <LinearGradient
        colors={railColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.rail}
      />

      {/* Card body */}
      <View style={styles.content}>

        {/* Top row: course label + kind badge */}
        <View style={styles.topRow}>
          <Text style={styles.courseLabel} numberOfLines={1}>{courseTitle}</Text>
          {badgeStyle && assignment.kind ? (
            <View style={[styles.kindBadge, { backgroundColor: badgeStyle.bg }]}>
              <Text style={[styles.kindText, { color: badgeStyle.text }]}>
                {assignment.kind.toLowerCase()}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Assignment title — Bricolage Grotesque */}
        <Text style={styles.title}>{assignment.title}</Text>

        {/* Meta row: due pill + estimated time */}
        <View style={styles.metaRow}>
          <View style={[styles.pill, { backgroundColor: pillStyle.bg }]}>
            <View style={[styles.dot, { backgroundColor: pillStyle.dot }]} />
            <Text style={[styles.pillText, { color: pillStyle.text }]}>{relativeDue}</Text>
          </View>
          {est !== null && (
            <Text style={styles.est}>◷ {est} min</Text>
          )}
        </View>

        {/* Focus progress bar (only when focusedMinutes > 0) */}
        {showProgress && (
          <View>
            <View style={styles.progTrack}>
              <LinearGradient
                colors={G.progFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progFill, { width: `${Math.round(progress * 100)}%` as any }]}
              />
            </View>
            <View style={styles.progNote}>
              <Text style={styles.progNoteText}>{focusedMinutes} / {est} min focused</Text>
              <Text style={styles.progNoteText}>{Math.round(progress * 100)}%</Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {/* Done: white circle with gray border */}
          <Pressable
            style={styles.doneButton}
            hitSlop={8}
            onPress={(e) => { e.stopPropagation(); onComplete(); }}
            accessibilityRole="button"
            accessibilityLabel="Mark done"
          >
            <CheckIcon size={16} color="#2fd19b" strokeWidth={2.5} />
          </Pressable>

          {/* Start Focus: peach gradient with depth shadow */}
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
              <Text style={styles.focusButtonText}>▶  Start Focus</Text>
            </LinearGradient>
          </Pressable>
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
    marginVertical:   5,
    borderRadius:     18,
    borderWidth:      1,
    borderColor:      C.cardBorder,
    overflow:         "hidden",
    ...shadow.s5card,
  },
  cardPressed: {
    opacity: 0.75,
  },
  // Gradient urgency rail — flex sibling, full card height via alignSelf stretch
  rail: {
    width:     5,
    flexShrink: 0,
  },
  content: {
    flex:          1,
    paddingTop:    14,
    paddingRight:  16,
    paddingBottom: 14,
    paddingLeft:   17,
    gap:           8,
  },
  topRow: {
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
  kindBadge: {
    borderRadius:    R.full,
    paddingVertical: 3,
    paddingHorizontal: 9,
    flexShrink:      0,
  },
  kindText: {
    fontSize:      10,
    fontFamily:    F.xbold,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  title: {
    fontFamily:    F.display,
    fontSize:      17,
    color:         C.ink,
    lineHeight:    21,
    letterSpacing: -0.25,
  },
  metaRow: {
    flexDirection: "row",
    alignItems:    "center",
    flexWrap:      "wrap",
    gap:           8,
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
    fontSize:      11,
    fontFamily:    F.xbold,
    letterSpacing: -0.05,
  },
  est: {
    fontSize:   11,
    fontFamily: F.bold,
    color:      "#6b6690",
  },
  progTrack: {
    height:       4,
    borderRadius: 4,
    backgroundColor: C.chipBg,
    overflow:     "hidden",
  },
  progFill: {
    height:       4,
    borderRadius: 4,
  },
  progNote: {
    flexDirection:  "row",
    justifyContent: "space-between",
    marginTop:      3,
  },
  progNoteText: {
    fontSize:      10,
    fontFamily:    F.xbold,
    color:         "#9793b8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  actions: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "flex-end",
    gap:            8,
    marginTop:      2,
  },
  doneButton: {
    width:           36,
    height:          36,
    borderRadius:    R.full,
    backgroundColor: C.surface,
    borderWidth:     2,
    borderColor:     "#d6d4e8",
    alignItems:      "center",
    justifyContent:  "center",
    flexShrink:      0,
  },
  focusButton: {
    borderRadius:      11,
    paddingVertical:   9,
    paddingHorizontal: 16,
    flexDirection:     "row",
    alignItems:        "center",
  },
  focusButtonText: {
    color:         "#fff",
    fontSize:      12,
    fontFamily:    F.xbold,
    letterSpacing: -0.05,
  },
});
