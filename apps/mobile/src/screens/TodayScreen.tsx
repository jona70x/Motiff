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
import { supabase } from "../lib/supabase";
import { getTodayAssignments, type AssignmentWithCourse } from "../lib/api/today";
import { completeAssignment, uncompleteAssignment } from "../lib/api/assignments";
import { bucketAssignment } from "../lib/time";
import { AssignmentCard } from "../components/AssignmentCard";
import { Icons } from "../lib/icons";
import { C, F, R, shadow } from "../theme";

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
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [laterExpanded, setLaterExpanded] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [undo, setUndo]               = useState<UndoState>(null);
  const [userInitial, setUserInitial] = useState("?");
  const undoTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoOpacity = useRef(new Animated.Value(0)).current;

  // Load avatar initial once on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const letter = session?.user.email?.[0]?.toUpperCase();
      if (letter) setUserInitial(letter);
    });
  }, []);

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
    (assignment: AssignmentWithCourse, bucket: keyof Buckets) => {
      const flatIndex = assignments.findIndex((a) => a.id === assignment.id);
      setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
      showUndoToast({ assignment, bucket, index: flatIndex });
      completeAssignment(assignment.id).catch(() => {
        setAssignments((prev) => {
          const next = [...prev];
          const insertAt = flatIndex >= 0 ? Math.min(flatIndex, next.length) : next.length;
          next.splice(insertAt, 0, assignment);
          return next;
        });
        setError("Failed to mark done. Please try again.");
        dismissUndo();
      });
    },
    [assignments, showUndoToast, dismissUndo]
  );

  const handleUndo = useCallback(() => {
    if (!undo) return;
    uncompleteAssignment(undo.assignment.id)
      .then(() => {
        setAssignments((prev) => {
          const next = [...prev];
          const insertAt = undo.index >= 0 ? Math.min(undo.index, next.length) : next.length;
          next.splice(insertAt, 0, undo.assignment);
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
        <ActivityIndicator size="large" color={C.indigo} />
      </View>
    );
  }

  const totalCount = buckets.today.length + buckets.this_week.length + buckets.later.length;
  const ChevronIcon = laterExpanded ? Icons.chevronDown : Icons.chevronRight;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Today</Text>
        <Pressable
          style={styles.avatarButton}
          onPress={() => navigation.navigate("Profile")}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Text style={styles.avatarText}>{userInitial}</Text>
        </Pressable>
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
              ChevronIcon={ChevronIcon}
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

// ── Section components ─────────────────────────────────────────────────────────

function BucketSection({
  title, assignments, bucketKey, emptyText, navigation, onComplete,
}: {
  title: string;
  assignments: AssignmentWithCourse[];
  bucketKey: keyof Buckets;
  emptyText: string;
  navigation: Props["navigation"];
  onComplete: (a: AssignmentWithCourse, bucket: keyof Buckets) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{assignments.length}</Text>
        </View>
      </View>
      {assignments.length === 0 ? (
        <Text style={styles.sectionEmpty}>{emptyText}</Text>
      ) : (
        assignments.map((a) => (
          <AssignmentCard
            key={a.id}
            assignment={a}
            onPress={() => navigation.navigate("AssignmentDetail", { assignmentId: a.id })}
            onStartFocus={() =>
              navigation.navigate("FocusTimer", { assignmentId: a.id, title: a.title })
            }
            onComplete={() => onComplete(a, bucketKey)}
          />
        ))
      )}
    </View>
  );
}

function CollapsibleSection({
  title, assignments, bucketKey, expanded, onToggle, navigation, onComplete, ChevronIcon,
}: {
  title: string;
  assignments: AssignmentWithCourse[];
  bucketKey: keyof Buckets;
  expanded: boolean;
  onToggle: () => void;
  navigation: Props["navigation"];
  onComplete: (a: AssignmentWithCourse, bucket: keyof Buckets) => void;
  ChevronIcon: (typeof Icons)[keyof typeof Icons];
}) {
  return (
    <View style={styles.section}>
      <Pressable style={styles.sectionHeader} onPress={onToggle} accessibilityRole="button">
        <View style={styles.sectionHeaderLeft}>
          <ChevronIcon size={16} color={C.textSub} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{assignments.length}</Text>
        </View>
      </Pressable>
      {expanded &&
        (assignments.length === 0 ? (
          <Text style={styles.sectionEmpty}>No later assignments</Text>
        ) : (
          assignments.map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              onPress={() => navigation.navigate("AssignmentDetail", { assignmentId: a.id })}
              onStartFocus={() =>
                navigation.navigate("FocusTimer", { assignmentId: a.id, title: a.title })
              }
              onComplete={() => onComplete(a, bucketKey)}
            />
          ))
        ))}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    fontSize: 28,
    fontFamily: F.xbold,
    color: C.text,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: R.full,
    backgroundColor: C.indigo,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  avatarText: {
    fontSize: 16,
    fontFamily: F.bold,
    color: C.textInverse,
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
    fontFamily: F.bold,
    color: C.text,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: F.body,
    color: C.textSub,
    textAlign: "center",
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: C.indigo,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: R.full,
  },
  ctaText: {
    color: C.textInverse,
    fontSize: 15,
    fontFamily: F.bold,
  },
  section: {
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: F.bold,
    color: C.textSub,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  countPill: {
    backgroundColor: C.indigoLight,
    borderRadius: R.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  countText: {
    fontSize: 12,
    fontFamily: F.bold,
    color: C.indigo,
  },
  sectionEmpty: {
    fontSize: 13,
    fontFamily: F.body,
    color: C.textMuted,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  errorBanner: {
    backgroundColor: C.errorBg,
    borderRadius: R.md,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  errorText: {
    color: C.error,
    fontSize: 13,
    fontFamily: F.medium,
  },
  undoBar: {
    position: "absolute",
    bottom: 140, // clears the floating tab bar
    left: 16,
    right: 16,
    backgroundColor: C.text,
    borderRadius: R.xl,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadow.float,
  },
  undoText: {
    color: C.textInverse,
    fontSize: 14,
    fontFamily: F.medium,
  },
  undoAction: {
    color: C.lemon,
    fontSize: 14,
    fontFamily: F.bold,
  },
});
