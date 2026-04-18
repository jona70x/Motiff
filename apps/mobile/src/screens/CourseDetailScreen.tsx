import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getCourseById } from "../lib/api/courses";
import { getAssignmentsByCourse } from "../lib/api/assignments";
import type { Course, Assignment } from "../lib/schema";

type Props = NativeStackScreenProps<any, "CourseDetail">;

export function CourseDetailScreen({ route, navigation }: Props) {
  const courseId = (route.params as any)?.courseId || "";
  const [course, setCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [courseData, assignmentData] = await Promise.all([
        getCourseById(courseId),
        getAssignmentsByCourse(courseId),
      ]);
      setCourse(courseData);
      setAssignments(assignmentData);
    } catch (err) {
      console.error("Failed to load course detail:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  if (loading && !course) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.center}>
        <Text>Course not found</Text>
      </View>
    );
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </Pressable>
      </View>

      <View style={styles.courseInfo}>
        <Text style={styles.courseTitle}>{course.title}</Text>
        {course.term && <Text style={styles.courseTerm}>{course.term}</Text>}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Assignments</Text>
      </View>

      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.assignmentCard}>
            <Text style={styles.assignmentTitle}>{item.title}</Text>
            <Text style={styles.assignmentDue}>{formatDate(item.due_at)}</Text>
            {item.est_minutes && (
              <Text style={styles.assignmentMeta}>~{item.est_minutes} min</Text>
            )}
            {item.kind && <Text style={styles.assignmentMeta}>{item.kind}</Text>}
          </View>
        )}
        contentContainerStyle={assignments.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No assignments yet</Text>
            <Text style={styles.emptySubtext}>Add an assignment to get started</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate("AddAssignment", { courseId })}
        accessibilityRole="button"
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
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
  courseInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e6",
  },
  courseTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  courseTerm: {
    fontSize: 14,
    color: "#555",
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  assignmentCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#3355cc",
  },
  assignmentTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
  },
  assignmentDue: {
    fontSize: 13,
    color: "#555",
    marginBottom: 4,
  },
  assignmentMeta: {
    fontSize: 12,
    color: "#999",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    fontSize: 28,
    fontWeight: "300",
    color: "#fff",
    marginBottom: 2,
  },
});
