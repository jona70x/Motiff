/**
 * @module screens/CoursesScreen
 * Displays the user's courses in two sections: active and completed.
 *
 * Per-course actions (accessible via the ⋯ button on each card):
 *   • Mark as Completed / Reopen — toggles completed_at on the course row.
 *   • Delete — calls the delete-course Edge Function which removes storage
 *     objects then the DB row (cascade handles child rows).
 *
 * The Sign Out button is in the header to keep it accessible without burying
 * it in a settings screen.
 */

import { useCallback, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { getCourses, completeCourse, uncompleteCourse, deleteCourseWithStorage } from "../lib/api/courses";
import type { Course } from "../lib/schema";
import { supabase } from "../lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<any, "Courses">;

/**
 * A flat list item — either a section header or a course card.
 * Avoids two separate FlatLists which complicates scroll behaviour.
 */
type ListItem =
  | { kind: "header"; label: string }
  | { kind: "course"; course: Course };

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Splits courses into active and completed and flattens them into a single
 * list with section headers interspersed. Returns the flat array for FlatList.
 */
function buildListItems(courses: Course[]): ListItem[] {
  const active    = courses.filter((c) => !c.completed_at);
  const completed = courses.filter((c) => !!c.completed_at);

  const items: ListItem[] = [];

  if (active.length > 0 || completed.length === 0) {
    // Always show an "Active" header when there are active courses,
    // or when both buckets are empty (empty state is rendered inside the list).
    items.push({ kind: "header", label: "Active" });
    active.forEach((c) => items.push({ kind: "course", course: c }));
  }

  if (completed.length > 0) {
    items.push({ kind: "header", label: "Completed" });
    completed.forEach((c) => items.push({ kind: "course", course: c }));
  }

  return items;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CoursesScreen({ navigation }: Props) {
  const [courses, setCourses]   = useState<Course[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Tracks which course ID is in the middle of a delete/complete operation.
  const [busyId, setBusyId] = useState<string | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadCourses = useCallback(async () => {
    try {
      const data = await getCourses();
      setCourses(data);
    } catch (err) {
      console.error("Failed to load courses:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadCourses();
    }, [loadCourses])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadCourses();
  }, [loadCourses]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  /**
   * Toggles a course between active and completed.
   * Optimistically updates local state; reloads on error.
   */
  const handleToggleComplete = useCallback(async (course: Course) => {
    if (busyId) return;
    setBusyId(course.id);

    const nowCompleting = !course.completed_at;

    // Optimistic update
    setCourses((prev) =>
      prev.map((c) =>
        c.id === course.id
          ? { ...c, completed_at: nowCompleting ? new Date().toISOString() : null }
          : c
      )
    );

    try {
      if (nowCompleting) {
        await completeCourse(course.id);
      } else {
        await uncompleteCourse(course.id);
      }
    } catch (err) {
      // Roll back on failure
      Alert.alert(
        "Action failed",
        err instanceof Error ? err.message : "Could not update course."
      );
      await loadCourses();
    } finally {
      setBusyId(null);
    }
  }, [busyId, loadCourses]);

  /**
   * Shows a confirmation dialog then calls the delete-course Edge Function.
   * Optimistically removes the card; reloads if the server call fails.
   */
  const handleDelete = useCallback(async (course: Course) => {
    Alert.alert(
      "Delete course?",
      `"${course.title}" and all its assignments and syllabi will be permanently deleted. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (busyId) return;
            setBusyId(course.id);

            // Optimistic remove
            setCourses((prev) => prev.filter((c) => c.id !== course.id));

            try {
              const session = await supabase.auth.getSession();
              const token = session.data.session?.access_token;
              if (!token) throw new Error("Not authenticated");
              await deleteCourseWithStorage(course.id, token);
            } catch (err) {
              Alert.alert(
                "Delete failed",
                err instanceof Error ? err.message : "Unknown error"
              );
              // Reload to restore the removed card
              await loadCourses();
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  }, [busyId, loadCourses]);

  /**
   * Opens a native action sheet (iOS) or Alert-based menu (Android) for a course.
   */
  const handleCourseMenu = useCallback((course: Course) => {
    const isCompleted = !!course.completed_at;
    const toggleLabel = isCompleted ? "Reopen course" : "Mark as completed";

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [toggleLabel, "Delete course", "Cancel"],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
        },
        (idx) => {
          if (idx === 0) handleToggleComplete(course);
          if (idx === 1) handleDelete(course);
        }
      );
    } else {
      Alert.alert(course.title, undefined, [
        { text: toggleLabel, onPress: () => handleToggleComplete(course) },
        { text: "Delete course", style: "destructive", onPress: () => handleDelete(course) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }, [handleToggleComplete, handleDelete]);

  // ── List data ─────────────────────────────────────────────────────────────

  const listItems = useMemo(() => buildListItems(courses), [courses]);

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.kind === "header") {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{item.label}</Text>
        </View>
      );
    }

    const { course } = item;
    const isBusy = busyId === course.id;
    const isCompleted = !!course.completed_at;

    return (
      <Pressable
        style={[styles.courseCard, isCompleted && styles.courseCardCompleted]}
        onPress={() => navigation.navigate("CourseDetail", { courseId: course.id })}
        accessibilityRole="button"
        accessibilityLabel={`${course.title}${isCompleted ? ", completed" : ""}`}
      >
        {/* Title + term */}
        <View style={styles.courseCardBody}>
          <Text style={[styles.courseTitle, isCompleted && styles.courseTitleCompleted]}>
            {course.title}
          </Text>
          {course.term && (
            <Text style={styles.courseTerm}>{course.term}</Text>
          )}
          {isCompleted && (
            <Text style={styles.completedBadge}>
              Completed {new Date(course.completed_at!).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Action menu trigger */}
        {isBusy ? (
          <ActivityIndicator size="small" color="#888" style={styles.menuTrigger} />
        ) : (
          <Pressable
            style={styles.menuTrigger}
            onPress={() => handleCourseMenu(course)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Course options"
          >
            <Text style={styles.menuTriggerText}>•••</Text>
          </Pressable>
        )}
      </Pressable>
    );
  }, [busyId, navigation, handleCourseMenu]);

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading && courses.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Courses</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      <FlatList
        data={listItems}
        keyExtractor={(item, index) =>
          item.kind === "course" ? item.course.id : `header-${index}`
        }
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No courses yet</Text>
            <Text style={styles.emptySubtext}>Add a course to get started</Text>
          </View>
        }
      />

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate("AddCourse")}
        accessibilityRole="button"
        accessibilityLabel="Add course"
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e6",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
  },
  signOutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f0f0f5",
    borderRadius: 6,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111",
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  courseCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e6",
  },
  courseCardCompleted: {
    backgroundColor: "#fafafa",
    borderColor: "#e8e8ee",
  },
  courseCardBody: {
    flex: 1,
    gap: 3,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  courseTitleCompleted: {
    color: "#888",
  },
  courseTerm: {
    fontSize: 13,
    color: "#777",
  },
  completedBadge: {
    fontSize: 11,
    color: "#aaa",
    marginTop: 2,
  },
  menuTrigger: {
    padding: 8,
    marginLeft: 8,
  },
  menuTriggerText: {
    fontSize: 16,
    color: "#bbb",
    letterSpacing: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
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
