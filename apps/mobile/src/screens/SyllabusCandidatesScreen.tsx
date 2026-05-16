import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  getCandidatesByUpload,
  confirmCandidate,
  rejectCandidate,
  bulkConfirmHighConfidence,
  type CandidateEdits,
} from "../lib/api/extraction";
import type { SyllabusCandidate } from "../lib/schema";
import { analytics } from "../lib/analytics";
import { C, F, R } from "../theme";

type Props = NativeStackScreenProps<any, "SyllabusCandidates">;

const BAND_COLOR: Record<SyllabusCandidate["confidence_band"], string> = {
  high:   C.success,
  medium: C.warning,
  low:    C.error,
};

const BAND_LABEL: Record<SyllabusCandidate["confidence_band"], string> = {
  high:   "High",
  medium: "Med",
  low:    "Low",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "No due date";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface EditState {
  title: string;
  dueAt: Date | null;
  kind: string;
  showDatePicker: boolean;
  showTimePicker: boolean;
}

interface CandidateCardProps {
  candidate: SyllabusCandidate;
  busy: boolean;
  isEditing: boolean;
  editState: EditState;
  onConfirm: () => void;
  onReject: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditChange: (patch: Partial<EditState>) => void;
}

function CandidateCard({
  candidate: c,
  busy,
  isEditing,
  editState,
  onConfirm,
  onReject,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditChange,
}: CandidateCardProps) {
  const isDone = c.status === "confirmed" || c.status === "edited" || c.status === "rejected";

  return (
    <View style={[styles.card, isDone && styles.cardDone]}>
      {/* Confidence badge */}
      <View style={[styles.badge, { backgroundColor: BAND_COLOR[c.confidence_band] }]}>
        <Text style={styles.badgeText}>
          {BAND_LABEL[c.confidence_band]} {(c.confidence * 100).toFixed(0)}%
        </Text>
      </View>

      {isEditing ? (
        <View style={styles.editForm}>
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.input}
            value={editState.title}
            onChangeText={(v) => onEditChange({ title: v })}
            placeholder="Assignment title"
            placeholderTextColor={C.textMuted}
            maxLength={500}
          />
          <Text style={styles.fieldLabel}>Kind (optional)</Text>
          <TextInput
            style={styles.input}
            value={editState.kind}
            onChangeText={(v) => onEditChange({ kind: v })}
            placeholder="e.g. exam, homework"
            placeholderTextColor={C.textMuted}
            maxLength={100}
          />
          <Text style={styles.fieldLabel}>Due date</Text>
          {editState.dueAt ? (
            <>
              {Platform.OS === "ios" ? (
                <DateTimePicker
                  value={editState.dueAt}
                  mode="datetime"
                  display="compact"
                  onChange={(_, d) => d && onEditChange({ dueAt: d })}
                />
              ) : (
                <>
                  <Pressable
                    style={({ pressed }) => [styles.dateBtn, pressed && styles.pressed]}
                    onPress={() => onEditChange({ showDatePicker: true })}
                  >
                    <Text style={styles.dateBtnText}>
                      {editState.dueAt.toLocaleDateString()}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.dateBtn, pressed && styles.pressed]}
                    onPress={() => onEditChange({ showTimePicker: true })}
                  >
                    <Text style={styles.dateBtnText}>
                      {editState.dueAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </Pressable>
                  {editState.showDatePicker && (
                    <DateTimePicker
                      value={editState.dueAt}
                      mode="date"
                      display="default"
                      onChange={(_, d) => {
                        onEditChange({ showDatePicker: false });
                        if (d) onEditChange({ dueAt: d });
                      }}
                    />
                  )}
                  {editState.showTimePicker && (
                    <DateTimePicker
                      value={editState.dueAt}
                      mode="time"
                      display="default"
                      onChange={(_, d) => {
                        onEditChange({ showTimePicker: false });
                        if (d) onEditChange({ dueAt: d });
                      }}
                    />
                  )}
                </>
              )}
              <Pressable onPress={() => onEditChange({ dueAt: null })}>
                {({ pressed }) => (
                  <Text style={[styles.clearDate, pressed && styles.pressed]}>Clear date</Text>
                )}
              </Pressable>
            </>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.dateBtn, pressed && styles.pressed]}
              onPress={() => onEditChange({ dueAt: new Date() })}
            >
              <Text style={styles.dateBtnText}>Set a due date</Text>
            </Pressable>
          )}

          <View style={styles.editActions}>
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                !editState.title.trim() && styles.btnDisabled,
                pressed && styles.pressed,
              ]}
              onPress={onSaveEdit}
              disabled={!editState.title.trim()}
            >
              <Text style={styles.saveBtnText}>Save & Confirm</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
              onPress={onCancelEdit}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <Text style={[styles.cardTitle, isDone && styles.cardTitleDone]} numberOfLines={2}>
            {c.title}
          </Text>
          <Text style={styles.cardMeta}>{formatDate(c.due_at)}</Text>
          {c.kind && <Text style={styles.cardMeta}>{c.kind}</Text>}

          {isDone ? (
            <Text style={styles.statusLabel}>
              {c.status === "rejected" ? "Rejected" : "Added to assignments"}
            </Text>
          ) : busy ? (
            <ActivityIndicator size="small" color={C.indigo} style={styles.spinner} />
          ) : (
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.confirmBtn, pressed && styles.pressed]}
                onPress={onConfirm}
              >
                <Text style={styles.confirmBtnText}>Confirm</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
                onPress={onStartEdit}
              >
                <Text style={styles.editBtnText}>Edit</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.rejectBtn, pressed && styles.pressed]}
                onPress={onReject}
              >
                <Text style={styles.rejectBtnText}>Reject</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}

export function SyllabusCandidatesScreen({ route, navigation }: Props) {
  const uploadId = (route.params as any)?.uploadId ?? "";
  const [candidates, setCandidates] = useState<SyllabusCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    title: "",
    dueAt: null,
    kind: "",
    showDatePicker: false,
    showTimePicker: false,
  });

  const load = useCallback(async () => {
    try {
      const data = await getCandidatesByUpload(uploadId);
      setCandidates(data);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to load candidates");
    } finally {
      setLoading(false);
    }
  }, [uploadId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setBusy = useCallback((id: string, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      busy ? next.add(id) : next.delete(id);
      return next;
    });
  }, []);

  const handleConfirm = useCallback(async (candidate: SyllabusCandidate) => {
    setBusy(candidate.id, true);
    try {
      await confirmCandidate(candidate);
      analytics.candidateConfirmed({ uploadId, kind: candidate.kind ?? null, wasEdited: false });
      setCandidates((prev) =>
        prev.map((c) => c.id === candidate.id ? { ...c, status: "confirmed" as const } : c)
      );
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to confirm");
    } finally {
      setBusy(candidate.id, false);
    }
  }, [setBusy, uploadId]);

  const handleReject = useCallback((candidate: SyllabusCandidate) => {
    Alert.alert(
      "Reject candidate?",
      `"${candidate.title}" will not be added as an assignment.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setBusy(candidate.id, true);
            try {
              await rejectCandidate(candidate.id);
              analytics.candidateRejected({ uploadId });
              setCandidates((prev) =>
                prev.map((c) => c.id === candidate.id ? { ...c, status: "rejected" as const } : c)
              );
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Failed to reject");
            } finally {
              setBusy(candidate.id, false);
            }
          },
        },
      ]
    );
  }, [setBusy]);

  const startEdit = useCallback((candidate: SyllabusCandidate) => {
    setEditingId(candidate.id);
    setEditState({
      title: candidate.title,
      dueAt: candidate.due_at ? new Date(candidate.due_at) : null,
      kind: candidate.kind ?? "",
      showDatePicker: false,
      showTimePicker: false,
    });
  }, []);

  const handleSaveEdit = useCallback(async (candidate: SyllabusCandidate) => {
    if (!editState.title.trim()) return;
    setBusy(candidate.id, true);
    setEditingId(null);
    const edits: CandidateEdits = {
      title:  editState.title.trim(),
      due_at: editState.dueAt ? editState.dueAt.toISOString() : null,
      kind:   editState.kind.trim() || null,
    };
    try {
      await confirmCandidate(candidate, edits);
      analytics.candidateConfirmed({ uploadId, kind: edits.kind, wasEdited: true });
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidate.id
            ? { ...c, status: "edited" as const, title: edits.title, due_at: edits.due_at ?? undefined, kind: edits.kind }
            : c
        )
      );
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(candidate.id, false);
    }
  }, [editState, setBusy]);

  const handleBulkConfirm = useCallback(async () => {
    const eligible = candidates.filter(
      (c) => c.status === "pending" && c.confidence_band === "high"
    );
    if (eligible.length === 0) {
      Alert.alert("Nothing to confirm", "No pending high-confidence items.");
      return;
    }
    Alert.alert(
      "Confirm all high-confidence?",
      `This will add ${eligible.length} item${eligible.length === 1 ? "" : "s"} to your assignments.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm all",
          onPress: async () => {
            setBulkBusy(true);
            try {
              const confirmed = await bulkConfirmHighConfidence(candidates);
              analytics.bulkConfirmed({ uploadId, count: confirmed });
              await load();
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Bulk confirm failed");
            } finally {
              setBulkBusy(false);
            }
          },
        },
      ]
    );
  }, [candidates, load]);

  const pendingHighCount = useMemo(
    () => candidates.filter((c) => c.status === "pending" && c.confidence_band === "high").length,
    [candidates]
  );

  const pendingCount = useMemo(
    () => candidates.filter((c) => c.status === "pending").length,
    [candidates]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.indigo} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button">
          {({ pressed }) => (
            <Text style={[styles.backButton, pressed && styles.pressed]}>← Back</Text>
          )}
        </Pressable>
        <Text style={styles.headerTitle}>Review Candidates</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={candidates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.subtitle}>
              {candidates.length} item{candidates.length === 1 ? "" : "s"} found
              {pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
            </Text>
            {pendingHighCount > 0 && (
              <Pressable
                style={({ pressed }) => [
                  styles.bulkBtn,
                  bulkBusy && styles.bulkBtnDisabled,
                  pressed && styles.pressed,
                ]}
                onPress={handleBulkConfirm}
                disabled={bulkBusy}
              >
                {bulkBusy ? (
                  <ActivityIndicator size="small" color={C.textInverse} />
                ) : (
                  <Text style={styles.bulkBtnText}>
                    Confirm {pendingHighCount} high-confidence
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No candidates found</Text>
            <Text style={styles.emptySubtext}>
              The extraction did not find any deadlines in this syllabus.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <CandidateCard
            candidate={item}
            busy={busyIds.has(item.id)}
            isEditing={editingId === item.id}
            editState={editState}
            onConfirm={() => handleConfirm(item)}
            onReject={() => handleReject(item)}
            onStartEdit={() => startEdit(item)}
            onCancelEdit={() => setEditingId(null)}
            onSaveEdit={() => handleSaveEdit(item)}
            onEditChange={(patch) => setEditState((prev) => ({ ...prev, ...patch }))}
          />
        )}
      />
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
  backButton: {
    fontSize: 16,
    fontFamily: F.medium,
    color: C.indigo,
    width: 60,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: F.bold,
    color: C.text,
  },
  pressed: {
    opacity: 0.7,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: F.body,
    color: C.textSub,
  },
  bulkBtn: {
    backgroundColor: C.success,
    borderRadius: R.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  bulkBtnDisabled: {
    opacity: 0.7,
  },
  bulkBtnText: {
    fontSize: 14,
    fontFamily: F.bold,
    color: C.textInverse,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  list: {
    paddingBottom: 32,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  cardDone: {
    opacity: 0.65,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: R.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: F.bold,
    color: C.textInverse,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: F.bold,
    color: C.text,
  },
  cardTitleDone: {
    color: C.textSub,
  },
  cardMeta: {
    fontSize: 13,
    fontFamily: F.body,
    color: C.textSub,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: C.success,
    borderRadius: R.sm,
    paddingVertical: 7,
    alignItems: "center",
  },
  confirmBtnText: {
    fontSize: 13,
    fontFamily: F.bold,
    color: C.textInverse,
  },
  editBtn: {
    flex: 1,
    backgroundColor: C.indigo,
    borderRadius: R.sm,
    paddingVertical: 7,
    alignItems: "center",
  },
  editBtnText: {
    fontSize: 13,
    fontFamily: F.bold,
    color: C.textInverse,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: C.borderLight,
    borderRadius: R.sm,
    paddingVertical: 7,
    alignItems: "center",
  },
  rejectBtnText: {
    fontSize: 13,
    fontFamily: F.bold,
    color: C.textSub,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: F.bold,
    color: C.textMuted,
    marginTop: 4,
  },
  spinner: {
    marginTop: 8,
  },
  editForm: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: F.bold,
    color: C.textSub,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: F.body,
    color: C.text,
    backgroundColor: C.bg,
  },
  dateBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: C.bg,
  },
  dateBtnText: {
    fontSize: 14,
    fontFamily: F.medium,
    color: C.indigo,
  },
  clearDate: {
    fontSize: 12,
    fontFamily: F.body,
    color: C.textMuted,
    marginTop: 2,
  },
  editActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: C.success,
    borderRadius: R.sm,
    paddingVertical: 9,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 13,
    fontFamily: F.bold,
    color: C.textInverse,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: C.borderLight,
    borderRadius: R.sm,
    paddingVertical: 9,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: F.bold,
    color: C.textSub,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 6,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: F.bold,
    color: C.textSub,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: F.body,
    color: C.textMuted,
    textAlign: "center",
  },
});
