import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  deleteAssignment,
  getAssignmentWithCourse,
  type AssignmentWithCourse,
} from "../lib/api/assignments";
import { formatRelativeDue } from "../lib/time";

type Props = NativeStackScreenProps<any, "AssignmentDetail">;

export function AssignmentDetailScreen({ route, navigation }: Props) {
  const assignmentId = (route.params as any)?.assignmentId || "";
  const [assignment, setAssignment] = useState<AssignmentWithCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const a = await getAssignmentWithCourse(assignmentId);
      setAssignment(a);
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

  const handleDelete = () => {
    Alert.alert(
      "Delete assignment?",
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAssignment(assignmentId);
              navigation.goBack();
            } catch (err) {
              setDeleting(false);
              Alert.alert(
                "Failed to delete",
                err instanceof Error ? err.message : "Unknown error"
              );
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

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
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backButton}>← Back</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate("AddAssignment", { assignmentId })}
          hitSlop={12}
        >
          <Text style={styles.editButton}>Edit</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {assignment.course && (
          <Text style={styles.courseLabel}>{assignment.course.title}</Text>
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

        <Pressable
          style={[styles.deleteBtn, deleting && styles.deleteBtnDisabled]}
          onPress={handleDelete}
          disabled={deleting}
          accessibilityRole="button"
        >
          {deleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.deleteBtnText}>Delete assignment</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  editButton: {
    fontSize: 16,
    color: "#3355cc",
    fontWeight: "600",
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
  deleteBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#b00020",
    alignItems: "center",
  },
  deleteBtnDisabled: {
    opacity: 0.5,
  },
  deleteBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
