import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatRelativeDue, isOverdue } from "../lib/time";
import type { AssignmentWithCourse } from "../lib/api/today";

type Props = {
  assignment: AssignmentWithCourse;
  onPress?: () => void;
};

export function AssignmentRow({ assignment, onPress }: Props) {
  const courseTitle = assignment.course?.title ?? "Unknown course";
  const relativeDue = formatRelativeDue(assignment.due_at);
  const overdue = isOverdue(assignment.due_at);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.content}>
        <Text style={styles.courseTitle} numberOfLines={1}>
          {courseTitle}
        </Text>
        <Text style={styles.assignmentTitle} numberOfLines={2}>
          {assignment.title}
        </Text>
      </View>
      <Text style={[styles.due, overdue && styles.dueOverdue]} numberOfLines={1}>
        {relativeDue}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e6",
    gap: 12,
  },
  rowPressed: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  courseTitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  assignmentTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  due: {
    fontSize: 13,
    fontWeight: "500",
    color: "#555",
  },
  dueOverdue: {
    color: "#b00020",
  },
});
