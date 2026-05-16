import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  createAssignment,
  getAssignmentById,
  updateAssignment,
} from "../lib/api/assignments";
import { getCourses } from "../lib/api/courses";
import { assignmentInsertSchema, type Course } from "../lib/schema";
import { Icons } from "../lib/icons";
import { C, F, R } from "../theme";

type Props = NativeStackScreenProps<any, "AddAssignment">;

export function AddAssignmentScreen({ route, navigation }: Props) {
  const params = (route.params as any) || {};
  const assignmentId: string | undefined = params.assignmentId;
  const routeCourseId: string | undefined = params.courseId;
  const isEdit = Boolean(assignmentId);

  const [courseId, setCourseId] = useState<string>(routeCourseId || "");
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [kind, setKind] = useState("");
  const [estMinutes, setEstMinutes] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAndroidPicker, setShowAndroidPicker] = useState<"date" | "time" | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assignmentId) return;
    let active = true;
    (async () => {
      try {
        const a = await getAssignmentById(assignmentId);
        if (!active || !a) return;
        setCourseId(a.course_id);
        setTitle(a.title);
        setDueAt(a.due_at ? new Date(a.due_at) : null);
        setKind(a.kind ?? "");
        setEstMinutes(a.est_minutes != null ? String(a.est_minutes) : "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load assignment");
      } finally {
        if (active) setLoadingExisting(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [assignmentId]);

  useEffect(() => {
    getCourses()
      .then((all) => setCourses(all.filter((c) => !c.completed_at)))
      .finally(() => setCoursesLoading(false));
  }, []);

  const validation = useMemo(() => {
    const estMinutesNum = estMinutes ? Number(estMinutes) : undefined;
    return assignmentInsertSchema.safeParse({
      title: title.trim(),
      due_at: dueAt ? dueAt.toISOString() : undefined,
      kind: kind.trim() || undefined,
      est_minutes: estMinutesNum,
    });
  }, [title, dueAt, kind, estMinutes]);

  const firstValidationError = validation.success
    ? null
    : validation.error.issues[0]?.message ?? "Invalid input";

  const disabled = loading || !validation.success || !courseId;

  const handleSubmit = async () => {
    if (!validation.success) {
      setError(firstValidationError);
      return;
    }
    setError(null);
    setLoading(true);

    try {
      if (isEdit && assignmentId) {
        await updateAssignment(assignmentId, validation.data);
        navigation.goBack();
      } else {
        await createAssignment(courseId, validation.data);
        Alert.alert("Success", "Assignment created", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save assignment");
    } finally {
      setLoading(false);
    }
  };

  const handleAndroidDatePress = useCallback(() => setShowAndroidPicker("date"), []);
  const handleAndroidTimePress = useCallback(() => {
    if (!dueAt) return;
    setShowAndroidPicker("time");
  }, [dueAt]);

  const handleAndroidPickerChange = useCallback(
    (_event: any, selected: Date | undefined) => {
      const mode = showAndroidPicker;
      setShowAndroidPicker(null);
      if (!selected || !mode) return;
      setDueAt((prev) => {
        const base = prev ? new Date(prev) : new Date();
        if (mode === "date") {
          base.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
        } else {
          base.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
        }
        return base;
      });
      if (mode === "date" && Platform.OS === "android") {
        setShowAndroidPicker("time");
      }
    },
    [showAndroidPicker]
  );

  if (loadingExisting) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.indigo} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button">
            {({ pressed }) => (
              <Text style={[styles.closeButton, pressed && styles.pressed]}>Cancel</Text>
            )}
          </Pressable>
          <Text style={styles.headerTitle}>{isEdit ? "Edit Assignment" : "New Assignment"}</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          {/* Course picker — hidden when courseId is pre-set from route params */}
          {!routeCourseId && (
            <View style={styles.field}>
              <Text style={styles.label}>Course</Text>
              {coursesLoading ? (
                <ActivityIndicator style={{ alignSelf: "flex-start" }} color={C.indigo} />
              ) : courses.length === 0 ? (
                <Text style={styles.emptyCoursesText}>
                  No active courses yet. Add a course first.
                </Text>
              ) : (
                <View style={styles.courseList}>
                  {courses.map((c) => {
                    const selected = courseId === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        style={({ pressed }) => [
                          styles.courseRow,
                          selected && styles.courseRowSelected,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => setCourseId(c.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                      >
                        <View style={styles.courseRowInner}>
                          <Text style={[styles.courseRowTitle, selected && styles.courseRowTitleSelected]}>
                            {c.title}
                          </Text>
                          {c.term ? (
                            <Text style={styles.courseRowTerm}>{c.term}</Text>
                          ) : null}
                        </View>
                        {selected && (
                          <View style={styles.courseCheck}>
                            <Icons.check size={14} color={C.textInverse} />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Chapter 5 Homework"
              placeholderTextColor={C.textMuted}
              value={title}
              onChangeText={setTitle}
              editable={!loading}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <View style={styles.dueRow}>
              <Text style={styles.label}>Due date</Text>
              {dueAt && (
                <Pressable
                  onPress={() => { setDueAt(null); setShowDatePicker(false); }}
                  hitSlop={8}
                >
                  {({ pressed }) => (
                    <Text style={[styles.clearLink, pressed && styles.pressed]}>Clear</Text>
                  )}
                </Pressable>
              )}
            </View>
            {Platform.OS === "ios" ? (
              <>
                <Pressable
                  style={({ pressed }) => [styles.setDateButton, pressed && styles.pressed]}
                  onPress={() => setShowDatePicker((v) => !v)}
                  accessibilityRole="button"
                >
                  <Text style={styles.setDateButtonText}>
                    {dueAt
                      ? dueAt.toLocaleString("en-US", {
                          month: "short", day: "numeric",
                          hour: "numeric", minute: "2-digit",
                        })
                      : "Set a due date"}
                  </Text>
                </Pressable>
                {showDatePicker && (
                  <DateTimePicker
                    value={dueAt ?? defaultDueDate()}
                    mode="datetime"
                    display="inline"
                    onChange={(_, selected) => {
                      if (selected) setDueAt(selected);
                    }}
                    minuteInterval={5}
                  />
                )}
              </>
            ) : (
              <View style={styles.androidDueRow}>
                <Pressable style={styles.setDateButton} onPress={handleAndroidDatePress}>
                  <Text style={styles.setDateButtonText}>
                    {dueAt ? dueAt.toLocaleDateString() : "Pick date"}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.setDateButton, !dueAt && styles.buttonDisabled]}
                  onPress={handleAndroidTimePress}
                  disabled={!dueAt}
                >
                  <Text style={styles.setDateButtonText}>
                    {dueAt
                      ? dueAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "Pick time"}
                  </Text>
                </Pressable>
              </View>
            )}
            {Platform.OS === "android" && showAndroidPicker && (
              <DateTimePicker
                value={dueAt ?? defaultDueDate()}
                mode={showAndroidPicker}
                is24Hour={false}
                onChange={handleAndroidPickerChange}
              />
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Type (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., homework, quiz, project"
              placeholderTextColor={C.textMuted}
              value={kind}
              onChangeText={setKind}
              editable={!loading}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Estimated minutes (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 60"
              placeholderTextColor={C.textMuted}
              value={estMinutes}
              onChangeText={(v) => setEstMinutes(v.replace(/[^0-9]/g, ""))}
              editable={!loading}
              keyboardType="number-pad"
            />
          </View>

          {(error || (title.length > 0 && firstValidationError)) && (
            <Text style={styles.error}>{error ?? firstValidationError}</Text>
          )}

          <Pressable
            style={[styles.submitButton, disabled && styles.buttonDisabled]}
            disabled={disabled}
            onPress={handleSubmit}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color={C.textInverse} />
            ) : (
              <Text style={styles.submitText}>
                {isEdit ? "Save changes" : "Create Assignment"}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function defaultDueDate(): Date {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  return d;
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  closeButton: {
    fontSize: 16,
    fontFamily: F.medium,
    color: C.indigo,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: F.bold,
    color: C.text,
  },
  pressed: {
    opacity: 0.7,
  },
  form: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: F.bold,
    color: C.text,
  },
  dueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clearLink: {
    fontSize: 13,
    fontFamily: F.medium,
    color: C.indigo,
  },
  setDateButton: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "flex-start",
  },
  setDateButtonText: {
    fontSize: 15,
    fontFamily: F.medium,
    color: C.indigo,
  },
  androidDueRow: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: F.body,
    color: C.text,
  },
  error: {
    color: C.error,
    fontSize: 14,
    fontFamily: F.medium,
  },
  submitButton: {
    backgroundColor: C.ink,
    borderRadius: R.lg,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: C.textInverse,
    fontSize: 16,
    fontFamily: F.display,
    fontWeight: "800",
  },
  emptyCoursesText: {
    fontSize: 14,
    fontFamily: F.body,
    color: C.textMuted,
    fontStyle: "italic",
  },
  courseList: {
    gap: 8,
  },
  courseRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  courseRowSelected: {
    borderColor: C.indigo,
    backgroundColor: C.indigoLight,
  },
  courseRowInner: {
    flex: 1,
    gap: 2,
  },
  courseRowTitle: {
    fontSize: 15,
    fontFamily: F.bold,
    color: C.text,
  },
  courseRowTitleSelected: {
    color: C.indigo,
  },
  courseRowTerm: {
    fontSize: 12,
    fontFamily: F.body,
    color: C.textMuted,
  },
  courseCheck: {
    width: 22,
    height: 22,
    borderRadius: R.full,
    backgroundColor: C.indigo,
    alignItems: "center",
    justifyContent: "center",
  },
});
