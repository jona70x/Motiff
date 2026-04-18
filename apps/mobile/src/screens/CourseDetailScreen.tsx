import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getCourseById } from "../lib/api/courses";
import { getAssignmentsByCourse } from "../lib/api/assignments";
import { getUploadsByCourse, deleteUpload } from "../lib/api/uploads";
import type { Course, Assignment, SyllabusUpload } from "../lib/schema";

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
  const [course, setCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [uploads, setUploads] = useState<SyllabusUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  type ListItem =
    | { type: "courseInfo" }
    | { type: "assignmentsHeader" }
    | { type: "assignment"; item: Assignment }
    | { type: "assignmentsEmpty" }
    | { type: "syllabusHeader" }
    | { type: "upload"; item: SyllabusUpload }
    | { type: "uploadsEmpty" };

  const listData: ListItem[] = [
    { type: "courseInfo" },
    { type: "assignmentsHeader" },
    ...(assignments.length === 0
      ? [{ type: "assignmentsEmpty" } as ListItem]
      : assignments.map((item): ListItem => ({ type: "assignment", item }))),
    { type: "syllabusHeader" },
    ...(uploads.length === 0
      ? [{ type: "uploadsEmpty" } as ListItem]
      : uploads.map((item): ListItem => ({ type: "upload", item }))),
  ];

  const renderItem = ({ item }: { item: ListItem }) => {
    switch (item.type) {
      case "courseInfo":
        return (
          <View style={styles.courseInfo}>
            <Text style={styles.courseTitle}>{course.title}</Text>
            {course.term && <Text style={styles.courseTerm}>{course.term}</Text>}
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
                  courseId: course.id,
                  courseName: course.title,
                })
              }
              accessibilityRole="button"
            >
              <Text style={styles.uploadBtnText}>+ Upload</Text>
            </Pressable>
          </View>
        );
      case "upload":
        return (
          <Pressable
            style={styles.uploadCard}
            onLongPress={() => handleDeleteUpload(item.item)}
            accessibilityHint="Long press to remove"
          >
            <View style={styles.uploadCardLeft}>
              <Text style={styles.uploadPath} numberOfLines={1}>
                {item.item.storage_path.split("/").pop() ?? item.item.storage_path}
              </Text>
              <Text style={styles.uploadMeta}>
                {(item.item.byte_size / 1024).toFixed(0)} KB ·{" "}
                {new Date(item.item.created_at).toLocaleDateString()}
              </Text>
            </View>
            <Text
              style={[
                styles.uploadStatus,
                { color: STATUS_COLOR[item.item.status] },
              ]}
            >
              {STATUS_LABEL[item.item.status]}
            </Text>
          </Pressable>
        );
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
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backButton}>← Back</Text>
        </Pressable>
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
