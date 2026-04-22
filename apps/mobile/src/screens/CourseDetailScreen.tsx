import { useFocusEffect } from "@react-navigation/native";
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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  getCourseById,
  completeCourse,
  uncompleteCourse,
  deleteCourseWithStorage,
} from "../lib/api/courses";
import { getAssignmentsByCourse } from "../lib/api/assignments";
import { getUploadsByCourse, deleteUpload } from "../lib/api/uploads";
import { triggerExtraction } from "../lib/api/extraction";
import type { Course, Assignment, SyllabusUpload } from "../lib/schema";
import { analytics } from "../lib/analytics";
import { supabase } from "../lib/supabase";

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "No due date";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ListItem =
  | { type: "courseInfo" }
  | { type: "assignmentsHeader" }
  | { type: "assignment"; item: Assignment }
  | { type: "assignmentsEmpty" }
  | { type: "syllabusHeader" }
  | { type: "upload"; item: SyllabusUpload }
  | { type: "uploadsEmpty" };

type Props = NativeStackScreenProps<any, "CourseDetail">;

const STATUS_LABEL: Record<SyllabusUpload["status"], string> = {
  pending:    "Pending",
  extracting: "Extracting…",
  extracted:  "Extracted",
  failed:     "Failed",
  unsupported:"Unsupported",
};

const STATUS_COLOR: Record<SyllabusUpload["status"], string> = {
  pending:    "#888",
  extracting: "#3355cc",
  extracted:  "#1a8a3a",
  failed:     "#b00020",
  unsupported:"#b00020",
};

export function CourseDetailScreen({ route, navigation }: Props) {
  const courseId = (route.params as any)?.courseId || "";
  const [course, setCourse]     = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [uploads, setUploads]   = useState<SyllabusUpload[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  // True while a complete/delete operation is in flight
  const [lifecycleBusy, setLifecycleBusy] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [courseData, assignmentData, uploadData] = await Promise.all([
        getCourseById(courseId),
        getAssignmentsByCourse(courseId),
        getUploadsByCourse(courseId),
      ]);
      setCourse(courseData);
      setAssignments(assignmentData);
      setUploads(uploadData);
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

  const handleExtract = useCallback(
    async (upload: SyllabusUpload) => {
      if (extractingId) return;
      setExtractingId(upload.id);
      // Optimistic status update
      setUploads((prev) =>
        prev.map((u) => (u.id === upload.id ? { ...u, status: "extracting" as const } : u))
      );

      analytics.extractionTriggered({ uploadId: upload.id, courseId: upload.course_id });
      try {
        const result = await triggerExtraction(upload.id);

        if (!result.ok) {
          analytics.extractionFailed({ uploadId: upload.id, reason: result.reason });
          const msg: Record<string, string> = {
            flag_off:        "Extraction is not enabled yet.",
            budget_exceeded: "Monthly extraction budget reached. Try again next month.",
            unsupported:     "This PDF is image-only and can't be extracted yet.",
            already_processed: "This syllabus has already been processed.",
          };
          Alert.alert("Extraction", msg[result.reason] ?? result.message ?? "Extraction failed.");
          await loadData();
          return;
        }

        analytics.extractionSucceeded({ uploadId: upload.id, candidateCount: result.count, partial: result.partial });
        Alert.alert(
          "Done!",
          result.count === 0
            ? "No deadlines found in the syllabus."
            : `Found ${result.count} item${result.count === 1 ? "" : "s"}. Review them in the Candidates screen.${result.partial ? " Note: syllabus was very long and was partially processed." : ""}`,
          [{ text: "OK" }]
        );
        await loadData();
      } catch (err) {
        analytics.extractionFailed({ uploadId: upload.id, reason: "exception" });
        Alert.alert("Error", err instanceof Error ? err.message : "Extraction failed");
        await loadData();
      } finally {
        setExtractingId(null);
      }
    },
    [extractingId, loadData]
  );

  const handleDeleteUpload = useCallback(
    (upload: SyllabusUpload) => {
      Alert.alert(
        "Remove syllabus?",
        "This will delete the file and cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteUpload(upload);
                setUploads((prev) => prev.filter((u) => u.id !== upload.id));
              } catch (err) {
                Alert.alert(
                  "Delete failed",
                  err instanceof Error ? err.message : "Unknown error"
                );
              }
            },
          },
        ]
      );
    },
    []
  );

  /**
   * Toggles the course between active and completed.
   * Navigates back after completion so the Courses list reflects the change immediately.
   */
  const handleToggleComplete = useCallback(async () => {
    if (!course || lifecycleBusy) return;
    setLifecycleBusy(true);

    const nowCompleting = !course.completed_at;
    try {
      if (nowCompleting) {
        await completeCourse(course.id);
      } else {
        await uncompleteCourse(course.id);
      }
      // Reload to surface the updated completed_at in the header badge.
      await loadData();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not update course.");
    } finally {
      setLifecycleBusy(false);
    }
  }, [course, lifecycleBusy, loadData]);

  /**
   * Confirms deletion with the user, then calls the Edge Function.
   * Navigates back to the Courses list on success.
   */
  const handleDeleteCourse = useCallback(() => {
    if (!course || lifecycleBusy) return;

    Alert.alert(
      "Delete course?",
      `"${course.title}" and all its assignments and syllabi will be permanently deleted. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLifecycleBusy(true);
            try {
              const session = await supabase.auth.getSession();
              const token = session.data.session?.access_token;
              if (!token) throw new Error("Not authenticated");
              await deleteCourseWithStorage(course.id, token);
              navigation.goBack();
            } catch (err) {
              Alert.alert("Delete failed", err instanceof Error ? err.message : "Unknown error");
              setLifecycleBusy(false);
            }
          },
        },
      ]
    );
  }, [course, lifecycleBusy, navigation]);

  /**
   * Opens a native action sheet / alert with course-level actions.
   */
  const handleCourseMenu = useCallback(() => {
    if (!course) return;
    const isCompleted  = !!course.completed_at;
    const toggleLabel  = isCompleted ? "Reopen course" : "Mark as completed";

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [toggleLabel, "Delete course", "Cancel"],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
        },
        (idx) => {
          if (idx === 0) handleToggleComplete();
          if (idx === 1) handleDeleteCourse();
        }
      );
    } else {
      Alert.alert(course.title, undefined, [
        { text: toggleLabel, onPress: handleToggleComplete },
        { text: "Delete course", style: "destructive", onPress: handleDeleteCourse },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }, [course, handleToggleComplete, handleDeleteCourse]);

  const listData = useMemo<ListItem[]>(() => {
    if (!course) return [];
    return [
      { type: "courseInfo" },
      { type: "assignmentsHeader" },
      ...(assignments.length === 0
        ? [{ type: "assignmentsEmpty" } as ListItem]
        : assignments.map((a): ListItem => ({ type: "assignment", item: a }))),
      { type: "syllabusHeader" },
      ...(uploads.length === 0
        ? [{ type: "uploadsEmpty" } as ListItem]
        : uploads.map((u): ListItem => ({ type: "upload", item: u }))),
    ];
  }, [course, assignments, uploads]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    switch (item.type) {
      case "courseInfo":
        return (
          <View style={styles.courseInfo}>
            <Text style={styles.courseTitle}>{course?.title}</Text>
            {course?.term && <Text style={styles.courseTerm}>{course.term}</Text>}
            {course?.completed_at && (
              <Text style={styles.courseCompletedNote}>
                Completed on {new Date(course.completed_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        );
      case "assignmentsHeader":
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Assignments</Text>
          </View>
        );
      case "assignment":
        return (
          <Pressable
            style={styles.assignmentCard}
            onPress={() =>
              navigation.navigate("AssignmentDetail", { assignmentId: item.item.id })
            }
            accessibilityRole="button"
          >
            <Text style={styles.assignmentTitle}>{item.item.title}</Text>
            <Text style={styles.assignmentDue}>{formatDate(item.item.due_at)}</Text>
            {item.item.est_minutes && (
              <Text style={styles.assignmentMeta}>~{item.item.est_minutes} min</Text>
            )}
            {item.item.kind && (
              <Text style={styles.assignmentMeta}>{item.item.kind}</Text>
            )}
          </Pressable>
        );
      case "assignmentsEmpty":
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No assignments yet</Text>
            <Text style={styles.emptySubtext}>Add an assignment to get started</Text>
          </View>
        );
      case "syllabusHeader":
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Syllabi</Text>
            <Pressable
              style={styles.uploadBtn}
              onPress={() =>
                navigation.navigate("SyllabusUpload", {
                  courseId: course?.id,
                  courseName: course?.title,
                })
              }
              accessibilityRole="button"
            >
              <Text style={styles.uploadBtnText}>+ Upload</Text>
            </Pressable>
          </View>
        );
      case "upload": {
        const u = item.item;
        const isExtracting = extractingId === u.id || u.status === "extracting";
        const canExtract   = u.status === "pending" || u.status === "failed";
        return (
          <View style={styles.uploadCard}>
            <View style={styles.uploadCardLeft}>
              <Text style={styles.uploadPath} numberOfLines={1}>
                {u.storage_path.split("/").pop() ?? u.storage_path}
              </Text>
              <Text style={styles.uploadMeta}>
                {(u.byte_size / 1024).toFixed(0)} KB ·{" "}
                {new Date(u.created_at).toLocaleDateString()}
              </Text>
              {u.error_msg && (
                <Text style={styles.uploadError} numberOfLines={2}>{u.error_msg}</Text>
              )}
            </View>
            <View style={styles.uploadCardRight}>
              {isExtracting ? (
                <ActivityIndicator size="small" color="#3355cc" />
              ) : canExtract ? (
                <Pressable
                  style={styles.extractBtn}
                  onPress={() => handleExtract(u)}
                  accessibilityRole="button"
                >
                  <Text style={styles.extractBtnText}>Extract</Text>
                </Pressable>
              ) : u.status === "extracted" ? (
                <Pressable
                  style={styles.viewCandidatesBtn}
                  onPress={() => navigation.navigate("SyllabusCandidates", { uploadId: u.id })}
                  accessibilityRole="button"
                >
                  <Text style={styles.viewCandidatesBtnText}>Review</Text>
                </Pressable>
              ) : (
                <Text style={[styles.uploadStatus, { color: STATUS_COLOR[u.status] }]}>
                  {STATUS_LABEL[u.status]}
                </Text>
              )}
              <Pressable
                style={styles.deleteUploadBtn}
                onPress={() => handleDeleteUpload(u)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Remove upload"
              >
                <Text style={styles.deleteUploadBtnText}>✕</Text>
              </Pressable>
            </View>
          </View>
        );
      }
      case "uploadsEmpty":
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No syllabus uploaded</Text>
            <Text style={styles.emptySubtext}>
              Upload a PDF to extract assignments automatically
            </Text>
          </View>
        );
    }
  }, [course, navigation, handleDeleteUpload, handleExtract, extractingId]);

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

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backButton}>Back</Text>
        </Pressable>

        {/* Right side: completed badge + action menu */}
        <View style={styles.headerRight}>
          {course.completed_at && (
            <Text style={styles.completedBadge}>Completed</Text>
          )}
          {lifecycleBusy ? (
            <ActivityIndicator size="small" color="#888" />
          ) : (
            <Pressable
              onPress={handleCourseMenu}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Course options"
            >
              <Text style={styles.menuTrigger}>•••</Text>
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item, index) => {
          if (item.type === "assignment") return `a-${item.item.id}`;
          if (item.type === "upload") return `u-${item.item.id}`;
          return `${item.type}-${index}`;
        }}
        renderItem={renderItem}
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e6",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  completedBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
    backgroundColor: "#f0f0f5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  menuTrigger: {
    fontSize: 16,
    color: "#bbb",
    letterSpacing: 1,
    padding: 4,
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
  courseCompletedNote: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e6",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e6",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  uploadBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#f0f0f5",
    borderRadius: 6,
  },
  uploadBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3355cc",
  },
  assignmentCard: {
    marginHorizontal: 16,
    marginVertical: 6,
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
  uploadCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e6",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  uploadCardLeft: {
    flex: 1,
    gap: 3,
  },
  uploadPath: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111",
  },
  uploadMeta: {
    fontSize: 12,
    color: "#888",
  },
  uploadStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  uploadCardRight: {
    alignItems: "center",
    gap: 6,
  },
  uploadError: {
    fontSize: 11,
    color: "#b00020",
    marginTop: 2,
  },
  extractBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#3355cc",
    borderRadius: 6,
  },
  extractBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  viewCandidatesBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#1a8a3a",
    borderRadius: 6,
  },
  viewCandidatesBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  deleteUploadBtn: {
    padding: 4,
  },
  deleteUploadBtnText: {
    fontSize: 12,
    color: "#aaa",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 4,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 32,
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
