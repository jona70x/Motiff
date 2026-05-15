import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  deleteAssignment,
  completeAssignment,
  uncompleteAssignment,
  getAssignmentWithCourse,
  type AssignmentWithCourse,
} from "../lib/api/assignments";
import { formatRelativeDue } from "../lib/time";
import { C, F, R } from "../theme";

type Props = NativeStackScreenProps<any, "AssignmentDetail">;

export function AssignmentDetailScreen({ route, navigation }: Props) {
  const assignmentId = (route.params as any)?.assignmentId || "";
  const [assignment, setAssignment] = useState<AssignmentWithCourse | null>(null);
  const [loading, setLoading]       = useState(true);
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting]     = useState(false);

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

  const handleToggleComplete = async () => {
    if (!assignment) return;
    setCompleting(true);
    try {
      if (assignment.completed_at) {
        const updated = await uncompleteAssignment(assignmentId);
        if (updated) setAssignment({ ...assignment, completed_at: null });
      } else {
        const updated = await completeAssignment(assignmentId);
        if (updated) setAssignment({ ...assignment, completed_at: updated.completed_at ?? null });
      }
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not update assignment.");
    } finally {
      setCompleting(false);
    }
  };

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
        <ActivityIndicator size="large" color={C.indigo} />
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>Assignment not found</Text>
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
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button">
          {({ pressed }) => (
            <Text style={[styles.backButton, pressed && styles.pressed]}>← Back</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate("AddAssignment", { assignmentId })}
          hitSlop={12}
          accessibilityRole="button"
        >
          {({ pressed }) => (
            <Text style={[styles.editButton, pressed && styles.pressed]}>Edit</Text>
          )}
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
          style={[
            styles.completeBtn,
            assignment.completed_at && styles.completeBtnDone,
            completing && styles.btnDisabled,
          ]}
          onPress={handleToggleComplete}
          disabled={completing || deleting}
          accessibilityRole="button"
        >
          {completing ? (
            <ActivityIndicator color={C.textInverse} />
          ) : (
            <Text style={styles.completeBtnText}>
              {assignment.completed_at ? "Mark as incomplete" : "Mark as completed"}
            </Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.deleteBtn, deleting && styles.btnDisabled]}
          onPress={handleDelete}
          disabled={deleting || completing}
          accessibilityRole="button"
        >
          {deleting ? (
            <ActivityIndicator color={C.textInverse} />
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
    backgroundColor: C.bg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: F.medium,
    color: C.textSub,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: {
    fontSize: 16,
    fontFamily: F.medium,
    color: C.indigo,
  },
  editButton: {
    fontSize: 16,
    fontFamily: F.bold,
    color: C.indigo,
  },
  pressed: {
    opacity: 0.6,
  },
  body: {
    padding: 20,
    gap: 16,
  },
  courseLabel: {
    fontSize: 12,
    fontFamily: F.medium,
    color: C.textSub,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 24,
    fontFamily: F.bold,
    color: C.text,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  metaLabel: {
    fontSize: 14,
    fontFamily: F.medium,
    color: C.textSub,
  },
  metaValue: {
    fontSize: 14,
    fontFamily: F.body,
    color: C.text,
    flexShrink: 1,
    textAlign: "right",
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.ink,
    borderRadius: R.md,
  },
  backBtnText: {
    color: C.textInverse,
    fontFamily: F.bold,
  },
  completeBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: R.lg,
    backgroundColor: C.success,
    alignItems: "center",
  },
  completeBtnDone: {
    backgroundColor: C.textSub,
  },
  completeBtnText: {
    color: C.textInverse,
    fontSize: 16,
    fontFamily: F.bold,
  },
  deleteBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: R.lg,
    backgroundColor: C.error,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  deleteBtnText: {
    color: C.textInverse,
    fontSize: 16,
    fontFamily: F.bold,
  },
});
