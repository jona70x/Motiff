import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { getTodayAssignments, type AssignmentWithCourse } from "../lib/api/today";
import { completeAssignment, uncompleteAssignment } from "../lib/api/assignments";
import { bucketAssignment } from "../lib/time";
import { AssignmentCard } from "../components/AssignmentCard";

type Props = BottomTabScreenProps<any, "Today">;

type Buckets = {
  today: AssignmentWithCourse[];
  this_week: AssignmentWithCourse[];
  later: AssignmentWithCourse[];
};

type UndoState = {
  assignment: AssignmentWithCourse;
  bucket: keyof Buckets;
  index: number;
} | null;

const UNDO_DURATION_MS = 4000;

export function TodayScreen({ navigation }: Props) {
  const [assignments, setAssignments] = useState<AssignmentWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [laterExpanded, setLaterExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<UndoState>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoOpacity = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getTodayAssignments();
      setAssignments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assignments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
      return () => {
        if (undoTimer.current) clearTimeout(undoTimer.current);
      };
    }, [load])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const dismissUndo = useCallback(() => {
    Animated.timing(undoOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
      setUndo(null)
    );
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, [undoOpacity]);

  const showUndoToast = useCallback(
    (state: UndoState) => {
      setUndo(state);
      Animated.timing(undoOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(dismissUndo, UNDO_DURATION_MS);
    },
    [undoOpacity, dismissUndo]
  );

  const handleComplete = useCallback(
    (assignment: AssignmentWithCourse, bucket: keyof Buckets, index: number) => {
      setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
      showUndoToast({ assignment, bucket, index });
      completeAssignment(assignment.id).catch(() => {
        setAssignments((prev) => {
          const next = [...prev];
          next.splice(index, 0, assignment);
          return next;
        });
        setError("Failed to mark done. Please try again.");
        dismissUndo();
      });
    },
    [showUndoToast, dismissUndo]
  );

  const handleUndo = useCallback(() => {
    if (!undo) return;
    uncompleteAssignment(undo.assignment.id)
      .then(() => {
        setAssignments((prev) => {
          const next = [...prev];
          next.splice(undo.index, 0, undo.assignment);
          return next;
        });
      })
      .catch(() => {
        setError("Failed to undo. Please refresh.");
      });
    dismissUndo();
  }, [undo, dismissUndo]);

  const buckets = useMemo<Buckets>(() => {
    const result: Buckets = { today: [], this_week: [], later: [] };
    const now = new Date();
    for (const a of assignments) {
      const bucket = bucketAssignment(a.due_at, now);
      result[bucket].push(a);
    }
    return result;
  }, [assignments]);

  if (loading && assignments.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const totalCount = buckets.today.length + buckets.this_week.length + buckets.later.length;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Today</Text>
      </View>

      <ScrollView
        contentContainerStyle={totalCount === 0 ? styles.emptyContainer : styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {totalCount === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nothing to show yet</Text>
            <Text style={styles.emptySubtext}>
              Add a course and assignments to see them here
            </Text>
            <Pressable
              style={styles.ctaButton}
              onPress={() => navigation.navigate("Courses")}
              accessibilityRole="button"
            >
              <Text style={styles.ctaText}>Go to Courses</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <BucketSection
              title="Today"
              assignments={buckets.today}
              bucketKey="today"
              emptyText="Nothing due today"
              navigation={navigation}
              onComplete={handleComplete}
            />
            <BucketSection
              title="This week"
              assignments={buckets.this_week}
              bucketKey="this_week"
              emptyText="Nothing due this week"
              navigation={navigation}
              onComplete={handleComplete}
            />
            <CollapsibleSection
              title="Later"
              assignments={buckets.later}
              bucketKey="later"
              expanded={laterExpanded}
              onToggle={() => setLaterExpanded((v) => !v)}
              navigation={navigation}
              onComplete={handleComplete}
            />
          </>
        )}
      </ScrollView>

      {undo && (
        <Animated.View style={[styles.undoBar, { opacity: undoOpacity }]}>
          <Text style={styles.undoText}>Marked as done</Text>
          <Pressable onPress={handleUndo} accessibilityRole="button">
            <Text style={styles.undoAction}>Undo</Text>
          </Pressable>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function BucketSection({
  title,
  assignments,
  bucketKey,
  emptyText,
  navigation,
  onComplete,
}: {
  title: string;
  assignments: AssignmentWithCourse[];
  bucketKey: keyof Buckets;
  emptyText: string;
  navigation: Props["navigation"];
  onComplete: (a: AssignmentWithCourse, bucket: keyof Buckets, index: number) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{assignments.length}</Text>
      </View>
      {assignments.length === 0 ? (
        <Text style={styles.sectionEmpty}>{emptyText}</Text>
      ) : (
        assignments.map((a, i) => (
          <AssignmentCard
            key={a.id}
            assignment={a}
            onPress={() => navigation.navigate("AssignmentDetail", { assignmentId: a.id })}
            onStartFocus={() =>
              navigation.navigate("FocusTimer", { assignmentId: a.id, title: a.title })
            }
            onComplete={() => onComplete(a, bucketKey, i)}
          />
        ))
      )}
    </View>
  );
}

function CollapsibleSection({
  title,
  assignments,
  bucketKey,
  expanded,
  onToggle,
  navigation,
  onComplete,
}: {
  title: string;
  assignments: AssignmentWithCourse[];
  bucketKey: keyof Buckets;
  expanded: boolean;
  onToggle: () => void;
  navigation: Props["navigation"];
  onComplete: (a: AssignmentWithCourse, bucket: keyof Buckets, index: number) => void;
}) {
  return (
    <View style={styles.section}>
      <Pressable style={styles.sectionHeader} onPress={onToggle} accessibilityRole="button">
        <Text style={styles.sectionTitle}>
          {title} {expanded ? "▾" : "▸"}
        </Text>
        <Text style={styles.sectionCount}>{assignments.length}</Text>
      </Pressable>
      {expanded &&
        (assignments.length === 0 ? (
          <Text style={styles.sectionEmpty}>No later assignments</Text>
        ) : (
          assignments.map((a, i) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              onPress={() => navigation.navigate("AssignmentDetail", { assignmentId: a.id })}
              onStartFocus={() =>
                navigation.navigate("FocusTimer", { assignmentId: a.id, title: a.title })
              }
              onComplete={() => onComplete(a, bucketKey, i)}
            />
          ))
        ))}
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
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e6",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  scrollContent: {
    paddingVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 32,
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: "#111",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  ctaText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: "500",
    color: "#999",
  },
  sectionEmpty: {
    fontSize: 13,
    color: "#999",
    paddingHorizontal: 20,
    paddingVertical: 8,
    fontStyle: "italic",
  },
  errorBanner: {
    backgroundColor: "#ffebee",
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  errorText: {
    color: "#b00020",
    fontSize: 13,
  },
  undoBar: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: "#222",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  undoText: {
    color: "#fff",
    fontSize: 14,
  },
  undoAction: {
    color: "#7eb8ff",
    fontSize: 14,
    fontWeight: "700",
  },
});
