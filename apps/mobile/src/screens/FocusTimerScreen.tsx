import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { usePomodoro } from "../hooks/usePomodoro";
import { createFocusSession } from "../lib/api/sessions";
import { getTransferTargets, type AssignmentWithCourse } from "../lib/api/today";
import { analytics } from "../lib/analytics";

type Props = NativeStackScreenProps<any, "FocusTimer">;

function formatMmSs(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusTimerScreen({ route, navigation }: Props) {
  const params = (route.params as any) || {};
  const assignmentId: string | null = params.assignmentId || null;
  const title: string = params.title ?? "Focus session";
  const initialDurationMs: number = params.durationMs ?? 25 * 60 * 1000;

  const { phase, remainingMs, elapsedMs, startedAt, start, pause, resume, cancel, finish } =
    usePomodoro(initialDurationMs);

  const [showBreak, setShowBreak] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargets, setTransferTargets] = useState<AssignmentWithCourse[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const sessionWritten = useRef(false);

  useEffect(() => {
    start();
    analytics.focusStarted({ assignmentId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const writeSession = useCallback(
    async (outcome: "completed" | "cancelled" | "paused_ended" | "transferred", durationMs: number) => {
      if (sessionWritten.current) return;
      sessionWritten.current = true;
      const now = new Date();
      const durationS = Math.round(durationMs / 1000);
      try {
        await createFocusSession({
          assignment_id: assignmentId,
          started_at:    (startedAt ?? now).toISOString(),
          ended_at:      now.toISOString(),
          duration_s:    durationS,
          outcome,
        });
      } catch {
        // best-effort
      }
    },
    [assignmentId, startedAt]
  );

  // Timer completed naturally
  useEffect(() => {
    if (phase !== "completed") return;
    const durationMs = elapsedMs;
    writeSession("completed", durationMs);
    analytics.focusCompleted({ assignmentId, durationS: Math.round(durationMs / 1000) });
    setShowBreak(true);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = useCallback(() => {
    Alert.alert("Cancel session?", "Your progress will be saved.", [
      { text: "Keep going", style: "cancel" },
      {
        text: "Cancel session",
        style: "destructive",
        onPress: () => {
          cancel();
          const dur = elapsedMs;
          writeSession("cancelled", dur);
          analytics.focusCancelled({ assignmentId, durationS: Math.round(dur / 1000) });
          navigation.goBack();
        },
      },
    ]);
  }, [cancel, elapsedMs, writeSession, assignmentId, navigation]);

  const handlePauseResume = useCallback(() => {
    if (phase === "running") pause();
    else if (phase === "paused") resume();
  }, [phase, pause, resume]);

  const handleDoneWithThis = useCallback(async () => {
    if (phase === "running") pause();
    setLoadingTargets(true);
    setShowTransferModal(true);
    try {
      const targets = assignmentId
        ? await getTransferTargets(assignmentId)
        : [];
      setTransferTargets(targets);
    } catch {
      setTransferTargets([]);
    } finally {
      setLoadingTargets(false);
    }
  }, [phase, pause, assignmentId]);

  const handleTransferDismiss = useCallback(() => {
    setShowTransferModal(false);
    if (phase === "paused") resume();
  }, [phase, resume]);

  const handleTransferPick = useCallback(
    async (target: AssignmentWithCourse) => {
      setShowTransferModal(false);
      const capturedRemaining = remainingMs;
      const capturedElapsed = elapsedMs;
      cancel();
      await writeSession("transferred", capturedElapsed);
      navigation.replace("FocusTimer", {
        assignmentId: target.id,
        title:        target.title,
        durationMs:   capturedRemaining,
      });
    },
    [remainingMs, elapsedMs, cancel, writeSession, navigation]
  );

  // ── Break screen ─────────────────────────────────────────────────────────────
  if (showBreak) {
    return (
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <View style={styles.breakBody}>
          <Text style={styles.breakEmoji}>🎉</Text>
          <Text style={styles.breakTitle}>Session complete!</Text>
          <Text style={styles.breakSub}>Take a 5-minute break before your next session.</Text>
          <Pressable
            style={styles.breakButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
          >
            <Text style={styles.breakButtonText}>Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isPaused = phase === "paused";
  const isActive = phase === "running" || phase === "paused";

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={handleCancel} hitSlop={12}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.assignmentLabel} numberOfLines={2}>
          {title}
        </Text>

        <View style={[styles.timerRing, isPaused && styles.timerRingPaused]}>
          <Text style={styles.timerText}>{formatMmSs(remainingMs)}</Text>
          {isPaused && <Text style={styles.pausedLabel}>PAUSED</Text>}
        </View>

        <Pressable
          style={[styles.primaryButton, isPaused && styles.primaryButtonResume]}
          onPress={handlePauseResume}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>{isPaused ? "Resume" : "Pause"}</Text>
        </Pressable>

        {isActive && (
          <Pressable
            style={styles.doneEarlyButton}
            onPress={handleDoneWithThis}
            accessibilityRole="button"
          >
            <Text style={styles.doneEarlyText}>Done with this assignment</Text>
          </Pressable>
        )}

        {__DEV__ && (
          <Pressable style={styles.devFinishButton} onPress={finish} accessibilityRole="button">
            <Text style={styles.devFinishText}>⚡ Finish now (dev)</Text>
          </Pressable>
        )}
      </View>

      {/* Transfer modal */}
      <Modal
        visible={showTransferModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleTransferDismiss}
      >
        <SafeAreaView style={styles.modalRoot} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Switch to</Text>
            <Pressable onPress={handleTransferDismiss} hitSlop={12} accessibilityRole="button">
              <Text style={styles.modalDismiss}>Cancel</Text>
            </Pressable>
          </View>

          <Text style={styles.modalSub}>
            {formatMmSs(remainingMs)} remaining will carry over
          </Text>

          {loadingTargets ? (
            <View style={styles.modalCenter}>
              <ActivityIndicator />
            </View>
          ) : transferTargets.length === 0 ? (
            <View style={styles.modalCenter}>
              <Text style={styles.emptyText}>No other assignments on Today</Text>
              <Pressable
                style={styles.emptyButton}
                onPress={() => {
                  setShowTransferModal(false);
                  navigation.navigate("MainTabs", { screen: "Today" });
                }}
                accessibilityRole="button"
              >
                <Text style={styles.emptyButtonText}>Go to Today</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={transferTargets}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.targetRow, pressed && styles.targetRowPressed]}
                  onPress={() => handleTransferPick(item)}
                  accessibilityRole="button"
                >
                  <Text style={styles.targetCourse} numberOfLines={1}>
                    {item.course?.title ?? "Unknown course"}
                  </Text>
                  <Text style={styles.targetTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "flex-end",
  },
  cancelText: {
    color: "#888",
    fontSize: 16,
    fontWeight: "500",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 40,
  },
  assignmentLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: "#ccc",
    textAlign: "center",
    lineHeight: 24,
  },
  timerRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  timerRingPaused: {
    borderColor: "#555",
  },
  timerText: {
    fontSize: 52,
    fontWeight: "200",
    color: "#fff",
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  pausedLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#666",
    letterSpacing: 2,
  },
  primaryButton: {
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingHorizontal: 48,
    paddingVertical: 16,
    minWidth: 160,
    alignItems: "center",
  },
  primaryButtonResume: {
    backgroundColor: "#3355cc",
  },
  primaryButtonText: {
    color: "#0a0a0a",
    fontSize: 17,
    fontWeight: "700",
  },
  doneEarlyButton: {
    marginTop: -16,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  doneEarlyText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  devFinishButton: {
    marginTop: -16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  devFinishText: {
    color: "#666",
    fontSize: 13,
    fontWeight: "600",
  },
  // ── Break screen ────────────────────────────────────────────────────────────
  breakBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  breakEmoji: {
    fontSize: 56,
  },
  breakTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
  },
  breakSub: {
    fontSize: 15,
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  breakButton: {
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingHorizontal: 48,
    paddingVertical: 16,
    minWidth: 160,
    alignItems: "center",
    marginTop: 8,
  },
  breakButtonText: {
    color: "#0a0a0a",
    fontSize: 17,
    fontWeight: "700",
  },
  // ── Transfer modal ──────────────────────────────────────────────────────────
  modalRoot: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  modalDismiss: {
    fontSize: 16,
    color: "#555",
    fontWeight: "500",
  },
  modalSub: {
    fontSize: 13,
    color: "#888",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#f6f6f8",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e6",
  },
  modalCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 32,
  },
  modalList: {
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  emptyButton: {
    backgroundColor: "#111",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  targetRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 4,
  },
  targetRowPressed: {
    backgroundColor: "#f0f0f4",
  },
  targetCourse: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  targetTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: "#f0f0f4",
    marginHorizontal: 20,
  },
});
