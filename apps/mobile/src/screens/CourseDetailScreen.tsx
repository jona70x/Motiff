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
import { Icons } from "../lib/icons";
import { C, F, R } from "../theme";

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
  pending:    C.textMuted,
  extracting: C.indigo,
  extracted:  C.success,
  failed:     C.error,
  unsupported:C.error,
};

export function CourseDetailScreen({ route, navigation }: Props) {
  const courseId = (route.params as any)?.courseId || "";
  const [course, setCourse]     = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [uploads, setUploads]   = useState<SyllabusUpload[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [extractingId, setExtractingId] = useState<string | null>(null);
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
      setUploads((prev) =>
        prev.map((u) => (u.id === upload.id ? { ...u, status: "extracting" as const } : u))
      );

      analytics.extractionTriggered({ uploadId: upload.id, courseId: upload.course_id });
      try {
        const result = await triggerExtraction(upload.id);

        if (!result.ok) {
          analytics.extractionFailed({ uploadId: upload.id, reason: result.reason });
          const msg: Record<string, string> = {
            flag_off:          "Extraction is not enabled yet.",
            budget_exceeded:   "Monthly extraction budget reached. Try again next month.",
            unsupported:       "This PDF is image-only and can't be extracted yet.",
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

  /** Opens a native action sheet / alert with course-level actions. */
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
            style={({ pressed }) => [styles.assignmentCard, pressed && styles.pressed]}
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
              style={({ pressed }) => [styles.uploadBtn, pressed && styles.pressed]}
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
                <ActivityIndicator size="small" color={C.indigo} />
              ) : canExtract ? (
                <Pressable
                  style={({ pressed }) => [styles.extractBtn, pressed && styles.pressed]}
                  onPress={() => handleExtract(u)}
                  accessibilityRole="button"
                >
                  <Text style={styles.extractBtnText}>Extract</Text>
                </Pressable>
              ) : u.status === "extracted" ? (
                <Pressable
                  style={({ pressed }) => [styles.viewCandidatesBtn, pressed && styles.pressed]}
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
                style={({ pressed }) => [styles.deleteUploadBtn, pressed && styles.pressed]}
                onPress={() => handleDeleteUpload(u)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Remove upload"
              >
                <Icons.close size={14} color={C.textMuted} />
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
        <ActivityIndicator size="large" color={C.indigo} />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>Course not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button">
          {({ pressed }) => (
            <Text style={[styles.backButton, pressed && styles.pressed]}>Back</Text>
          )}
        </Pressable>

        <View style={styles.headerRight}>
          {course.completed_at && (
            <Text style={styles.completedBadge}>Completed</Text>
          )}
          {lifecycleBusy ? (
            <ActivityIndicator size="small" color={C.textMuted} />
          ) : (
            <Pressable
              onPress={handleCourseMenu}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Course options"
            >
              {({ pressed }) => (
                <Icons.moreHorizontal size={20} color={pressed ? C.textSub : C.textMuted} />
              )}
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
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        onPress={() => navigation.navigate("AddAssignment", { courseId })}
        accessibilityRole="button"
        accessibilityLabel="Add assignment"
      >
        <Icons.add size={28} color={C.textInverse} />
      </Pressable>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  completedBadge: {
    fontSize: 11,
    fontFamily: F.bold,
    color: C.textMuted,
    backgroundColor: C.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.full,
  },
  backButton: {
    fontSize: 16,
    fontFamily: F.medium,
    color: C.indigo,
  },
  pressed: {
    opacity: 0.7,
  },
  courseInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  courseTitle: {
    fontSize: 24,
    fontFamily: F.bold,
    color: C.text,
    marginBottom: 4,
  },
  courseTerm: {
    fontSize: 14,
    fontFamily: F.body,
    color: C.textSub,
  },
  courseCompletedNote: {
    fontSize: 12,
    fontFamily: F.body,
    color: C.textMuted,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: C.surface,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: F.bold,
    color: C.text,
  },
  uploadBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: C.borderLight,
    borderRadius: R.sm,
  },
  uploadBtnText: {
    fontSize: 13,
    fontFamily: F.bold,
    color: C.indigo,
  },
  assignmentCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderLeftWidth: 4,
    borderLeftColor: C.indigo,
  },
  assignmentTitle: {
    fontSize: 15,
    fontFamily: F.bold,
    color: C.text,
    marginBottom: 4,
  },
  assignmentDue: {
    fontSize: 13,
    fontFamily: F.body,
    color: C.textSub,
    marginBottom: 4,
  },
  assignmentMeta: {
    fontSize: 12,
    fontFamily: F.body,
    color: C.textMuted,
  },
  uploadCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
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
    fontFamily: F.medium,
    color: C.text,
  },
  uploadMeta: {
    fontSize: 12,
    fontFamily: F.body,
    color: C.textMuted,
  },
  uploadStatus: {
    fontSize: 12,
    fontFamily: F.bold,
  },
  uploadCardRight: {
    alignItems: "center",
    gap: 6,
  },
  uploadError: {
    fontSize: 11,
    fontFamily: F.body,
    color: C.error,
    marginTop: 2,
  },
  extractBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: C.indigo,
    borderRadius: R.sm,
  },
  extractBtnText: {
    fontSize: 12,
    fontFamily: F.bold,
    color: C.textInverse,
  },
  viewCandidatesBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: C.success,
    borderRadius: R.sm,
  },
  viewCandidatesBtnText: {
    fontSize: 12,
    fontFamily: F.bold,
    color: C.textInverse,
  },
  deleteUploadBtn: {
    padding: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 4,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: F.bold,
    color: C.textSub,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: F.body,
    color: C.textMuted,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: R.full,
    backgroundColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
