import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icons } from "../lib/icons";
import { formatRelativeDue, isOverdue, urgencyRailColor } from "../lib/time";
import type { AssignmentWithCourse } from "../lib/api/today";
import { C, F, R, shadow } from "../theme";

type Props = {
  assignment: AssignmentWithCourse;
  onPress?: () => void;
  onStartFocus: () => void;
  onComplete: () => void;
};

// ── Kind pill styles ───────────────────────────────────────────────────────────

const KIND_STYLES: Record<string, { bg: string; text: string }> = {
  exam:       { bg: "#FFE4E6", text: "#9F1239" },
  assignment: { bg: C.indigoLight, text: C.indigo },
  project:    { bg: "#F3E8FF", text: "#6B21A8" },
  reading:    { bg: C.successBg,  text: C.success  },
  other:      { bg: C.borderLight, text: C.textSub },
};

function kindStyle(kind: string | null | undefined) {
  if (!kind) return null;
  return KIND_STYLES[kind.toLowerCase()] ?? KIND_STYLES.other;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AssignmentCard({ assignment, onPress, onStartFocus, onComplete }: Props) {
  const courseTitle = assignment.course?.title ?? "Unknown course";
  const relativeDue = formatRelativeDue(assignment.due_at);
  const overdue     = isOverdue(assignment.due_at);
  const badge       = kindStyle(assignment.kind);
  const railColor   = urgencyRailColor(assignment.due_at);

  const CheckIcon = Icons.check;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      {/* Urgency color rail */}
      <View style={[styles.rail, { backgroundColor: railColor }]} />

      <View style={styles.content}>
        {/* Top row: course label + kind pill */}
        <View style={styles.topRow}>
          <Text style={styles.courseLabel} numberOfLines={1}>
            {courseTitle}
          </Text>
          {badge && assignment.kind ? (
            <View style={[styles.kindPill, { backgroundColor: badge.bg }]}>
              <Text style={[styles.kindText, { color: badge.text }]}>
                {assignment.kind.toLowerCase()}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {assignment.title}
        </Text>

        {/* Bottom row: meta + actions */}
        <View style={styles.bottomRow}>
          <View style={styles.metaRow}>
            {assignment.est_minutes != null && (
              <Text style={styles.estMinutes}>{assignment.est_minutes} min</Text>
            )}
            {relativeDue ? (
              <Text style={[styles.due, overdue && styles.dueOverdue]}>{relativeDue}</Text>
            ) : null}
          </View>

          <View style={styles.actions}>
            {/* Mint done button — 32×32 visual, hitSlop expands tap to ≥44pt */}
            <Pressable
              style={styles.doneButton}
              hitSlop={8}
              onPress={(e) => { e.stopPropagation(); onComplete(); }}
              accessibilityRole="button"
              accessibilityLabel="Mark done"
            >
              <CheckIcon size={14} color={C.mint} strokeWidth={2.5} />
            </Pressable>

            {/* Peach Start Focus button */}
            <Pressable
              style={styles.focusButton}
              hitSlop={4}
              onPress={(e) => { e.stopPropagation(); onStartFocus(); }}
              accessibilityRole="button"
              accessibilityLabel="Start Focus"
            >
              <Text style={styles.focusButtonText}>Start Focus</Text>
            </Pressable>
          </View>
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
    borderRadius: 0,
    flexShrink: 0,
  },
  content: {
    flex: 1,
    padding: 13,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  courseLabel: {
    flex: 1,
    fontSize: 11,
    fontFamily: F.medium,
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  kindPill: {
    borderRadius: R.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  kindText: {
    fontSize: 11,
    fontFamily: F.bold,
    textTransform: "capitalize",
  },
  title: {
    fontSize: 15,
    fontFamily: F.bold,
    color: C.text,
    lineHeight: 20,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  metaRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  estMinutes: {
    fontSize: 12,
    fontFamily: F.medium,
    color: C.textSub,
  },
  due: {
    fontSize: 12,
    fontFamily: F.medium,
    color: C.textSub,
  },
  dueOverdue: {
    color: C.error,
    fontFamily: F.bold,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  doneButton: {
    width: 32,
    height: 32,
    borderRadius: R.full,
    borderWidth: 2,
    borderColor: C.mint,
    alignItems: "center",
    justifyContent: "center",
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
