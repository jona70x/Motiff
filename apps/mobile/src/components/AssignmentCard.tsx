import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatRelativeDue, isOverdue } from "../lib/time";
import type { AssignmentWithCourse } from "../lib/api/today";

type Props = {
  assignment: AssignmentWithCourse;
  onPress?: () => void;
  onStartFocus: () => void;
};

const KIND_STYLES: Record<string, { bg: string; text: string }> = {
  exam:       { bg: "#ffebee", text: "#b00020" },
  assignment: { bg: "#e3f2fd", text: "#1565c0" },
  project:    { bg: "#f3e5f5", text: "#6a1b9a" },
  reading:    { bg: "#e8f5e9", text: "#2e7d32" },
  other:      { bg: "#f5f5f5", text: "#555" },
};

function kindStyle(kind: string | null | undefined) {
  if (!kind) return null;
  const k = kind.toLowerCase();
  return KIND_STYLES[k] ?? KIND_STYLES.other;
}

export function AssignmentCard({ assignment, onPress, onStartFocus }: Props) {
  const courseTitle = assignment.course?.title ?? "Unknown course";
  const relativeDue = formatRelativeDue(assignment.due_at);
  const overdue = isOverdue(assignment.due_at);
  const badge = kindStyle(assignment.kind);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.topRow}>
        <Text style={styles.courseLabel} numberOfLines={1}>
          {courseTitle}
        </Text>
        {badge && assignment.kind ? (
          <View style={[styles.kindBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.kindText, { color: badge.text }]}>
              {assignment.kind.toLowerCase()}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {assignment.title}
      </Text>

      <View style={styles.bottomRow}>
        <View style={styles.metaRow}>
          {assignment.est_minutes != null && (
            <Text style={styles.estMinutes}>~{assignment.est_minutes} min</Text>
          )}
          {relativeDue ? (
            <Text style={[styles.due, overdue && styles.dueOverdue]}>{relativeDue}</Text>
          ) : null}
        </View>

        <Pressable
          style={styles.focusButton}
          onPress={(e) => {
            e.stopPropagation();
            onStartFocus();
          }}
          accessibilityRole="button"
          accessibilityLabel="Start Focus"
        >
          <Text style={styles.focusButtonText}>Start Focus</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e6",
    padding: 14,
    gap: 6,
  },
  cardPressed: {
    opacity: 0.7,
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
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kindBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  kindText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    lineHeight: 20,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
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
    color: "#666",
    fontWeight: "500",
  },
  due: {
    fontSize: 12,
    color: "#555",
    fontWeight: "500",
  },
  dueOverdue: {
    color: "#b00020",
    fontWeight: "600",
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
