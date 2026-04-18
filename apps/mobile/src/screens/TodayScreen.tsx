import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { getTodayAssignments, type AssignmentWithCourse } from "../lib/api/today";
import { bucketAssignment } from "../lib/time";
import { AssignmentRow } from "../components/AssignmentRow";

type Props = BottomTabScreenProps<any, "Today">;

type Buckets = {
  today: AssignmentWithCourse[];
  this_week: AssignmentWithCourse[];
  later: AssignmentWithCourse[];
};

export function TodayScreen({ navigation }: Props) {
  const [assignments, setAssignments] = useState<AssignmentWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [laterExpanded, setLaterExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    }, [load])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

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
    <View style={styles.root}>
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
            <Section
              title="Today"
              count={buckets.today.length}
              assignments={buckets.today}
              emptyText="Nothing due today"
              navigation={navigation}
            />
            <Section
              title="This week"
              count={buckets.this_week.length}
              assignments={buckets.this_week}
              emptyText="Nothing due this week"
              navigation={navigation}
            />
            <CollapsibleSection
              title="Later"
              count={buckets.later.length}
              assignments={buckets.later}
              expanded={laterExpanded}
              onToggle={() => setLaterExpanded((v) => !v)}
              navigation={navigation}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  count,
  assignments,
  emptyText,
  navigation,
}: {
  title: string;
  count: number;
  assignments: AssignmentWithCourse[];
  emptyText: string;
  navigation: Props["navigation"];
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{count}</Text>
      </View>
      {assignments.length === 0 ? (
        <Text style={styles.sectionEmpty}>{emptyText}</Text>
      ) : (
        assignments.map((a) => (
          <AssignmentRow
            key={a.id}
            assignment={a}
            onPress={() => navigation.navigate("AssignmentDetail", { assignmentId: a.id })}
          />
        ))
      )}
    </View>
  );
}

function CollapsibleSection({
  title,
  count,
  assignments,
  expanded,
  onToggle,
  navigation,
}: {
  title: string;
  count: number;
  assignments: AssignmentWithCourse[];
  expanded: boolean;
  onToggle: () => void;
  navigation: Props["navigation"];
}) {
  return (
    <View style={styles.section}>
      <Pressable style={styles.sectionHeader} onPress={onToggle} accessibilityRole="button">
        <Text style={styles.sectionTitle}>
          {title} {expanded ? "▾" : "▸"}
        </Text>
        <Text style={styles.sectionCount}>{count}</Text>
      </Pressable>
      {expanded &&
        (assignments.length === 0 ? (
          <Text style={styles.sectionEmpty}>No later assignments</Text>
        ) : (
          assignments.map((a) => (
            <AssignmentRow
              key={a.id}
              assignment={a}
              onPress={() => navigation.navigate("AssignmentDetail", { assignmentId: a.id })}
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
});
