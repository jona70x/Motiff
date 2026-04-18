import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getAssignmentById } from "../lib/api/assignments";
import { getCourseById } from "../lib/api/courses";
import type { Assignment, Course } from "../lib/schema";
import { formatRelativeDue } from "../lib/time";

type Props = NativeStackScreenProps<any, "AssignmentDetail">;

export function AssignmentDetailScreen({ route, navigation }: Props) {
  const assignmentId = (route.params as any)?.assignmentId || "";
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const a = await getAssignmentById(assignmentId);
      setAssignment(a);
      if (a?.course_id) {
        const c = await getCourseById(a.course_id);
        setCourse(c);
      }
    } catch (err) {
      console.error("Failed to load assignment:", err);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={styles.center}>
        <Text>Assignment not found</Text>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const dueAtFormatted = assignment.due_at
    ? new Date(assignment.due_at).toLocaleString()
    : "No due date";

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {course && (
          <Text style={styles.courseLabel}>{course.title}</Text>
        )}
        <Text style={styles.title}>{assignment.title}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Due</Text>
          <Text style={styles.metaValue}>{dueAtFormatted}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Relative</Text>
          <Text style={styles.metaValue}>{formatRelativeDue(assignment.due_at)}</Text>
        </View>

        {assignment.kind && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Type</Text>
            <Text style={styles.metaValue}>{assignment.kind}</Text>
          </View>
        )}

        {assignment.est_minutes && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Estimated</Text>
            <Text style={styles.metaValue}>{assignment.est_minutes} minutes</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f6f6f8",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e6",
  },
  backButton: {
    fontSize: 16,
    color: "#3355cc",
    fontWeight: "500",
  },
  body: {
    padding: 20,
    gap: 16,
  },
  courseLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e6",
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  metaValue: {
    fontSize: 14,
    color: "#111",
    flexShrink: 1,
    textAlign: "right",
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#111",
    borderRadius: 6,
  },
  backBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});
