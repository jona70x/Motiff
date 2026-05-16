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
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { usePomodoro, DEFAULT_DURATION_MS } from "../hooks/usePomodoro";
import { createFocusSession } from "../lib/api/sessions";
import { getTransferTargets, type AssignmentWithCourse } from "../lib/api/today";
import { analytics } from "../lib/analytics";
import { C, F, R } from "../theme";

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
  const isFreeMode = assignmentId === null;
  const title: string = params.title ?? (isFreeMode ? "Free focus" : "Focus session");
  const initialDurationMs: number = params.durationMs ?? DEFAULT_DURATION_MS;

  const { phase, remainingMs, elapsedMs, startedAt, start, pause, resume, cancel, finish } =
    usePomodoro(initialDurationMs);

  const [showBreak, setShowBreak]               = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargets, setTransferTargets]   = useState<AssignmentWithCourse[]>([]);
  const [loadingTargets, setLoadingTargets]     = useState(false);
  const sessionWritten  = useRef(false);
  const wasAlreadyPaused = useRef(false);

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

  const handleEndSession = useCallback(() => {
    cancel();
    const dur = elapsedMs;
    writeSession("cancelled", dur);
    analytics.focusCancelled({ assignmentId, durationS: Math.round(dur / 1000) });
    navigation.goBack();
  }, [cancel, elapsedMs, writeSession, assignmentId, navigation]);

  const handleDoneWithThis = useCallback(async () => {
    wasAlreadyPaused.current = phase === "paused";
    if (!wasAlreadyPaused.current) pause();
    setLoadingTargets(true);
    setShowTransferModal(true);
    try {
      const targets = assignmentId ? await getTransferTargets(assignmentId) : [];
      setTransferTargets(targets);
    } catch {
      setTransferTargets([]);
    } finally {
      setLoadingTargets(false);
    }
  }, [phase, pause, assignmentId]);

  const handleTransferDismiss = useCallback(() => {
    setShowTransferModal(false);
    if (phase === "paused" && !wasAlreadyPaused.current) resume();
  }, [phase, resume]);

  const handleTransferPick = useCallback(
    async (target: AssignmentWithCourse) => {
      setShowTransferModal(false);
      const capturedRemaining = remainingMs;
      const capturedElapsed   = elapsedMs;
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

        {/* Pause = white pill / Resume = indigo gradient with depth shadow */}
        {isPaused ? (
          <Pressable
            style={styles.resumeDepth}
            onPress={handlePauseResume}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={["#7a5cff", "#5b3df5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.resumeGradient}
            >
              <Text style={styles.resumeText}>Resume</Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            style={styles.primaryButton}
            onPress={handlePauseResume}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Pause</Text>
          </Pressable>
        )}

        {isActive && (
          isFreeMode ? (
            <Pressable
              style={styles.doneEarlyButton}
              onPress={handleEndSession}
              accessibilityRole="button"
            >
              <Text style={styles.doneEarlyText}>End session</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.doneEarlyButton}
              onPress={handleDoneWithThis}
              accessibilityRole="button"
            >
              <Text style={styles.doneEarlyText}>Done with this assignment</Text>
            </Pressable>
          )
        )}

        {__DEV__ && (
          <Pressable style={styles.devFinishButton} onPress={finish} accessibilityRole="button">
            <Text style={styles.devFinishText}>Finish now (dev)</Text>
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
              <ActivityIndicator color={C.indigo} />
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
    backgroundColor: C.dark,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "flex-end",
  },
  cancelText: {
    color: C.darkMuted,
    fontSize: 16,
    fontFamily: F.medium,
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
    fontFamily: F.medium,
    color: "#cccccc",
    textAlign: "center",
    lineHeight: 24,
  },
  timerRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 4,
    borderColor: C.darkText,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  timerRingPaused: {
    borderColor: "#555555",
  },
  timerText: {
    fontSize: 52,
    fontWeight: "200",
    color: C.darkText,
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  pausedLabel: {
    fontSize: 11,
    fontFamily: F.bold,
    color: "#666666",
    letterSpacing: 2,
  },
  primaryButton: {
    backgroundColor: C.darkText,
    borderRadius: R.full,
    paddingHorizontal: 32,
    paddingVertical: 12,
    minWidth: 160,
    alignItems: "center",
  },
  primaryButtonText: {
    color: C.dark,
    fontSize: 17,
    fontFamily: F.xbold,
  },
  resumeDepth: {
    borderRadius: R.full,
    backgroundColor: "#3a21c4",
    minWidth: 160,
  },
  resumeGradient: {
    borderRadius: R.full,
    paddingHorizontal: 32,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 3,
  },
  resumeText: {
    color: C.darkText,
    fontSize: 17,
    fontFamily: F.xbold,
  },
  doneEarlyButton: {
    marginTop: -16,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  doneEarlyText: {
    color: "#6b6690",
    fontSize: 14,
    fontFamily: F.bold,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  devFinishButton: {
    marginTop: -16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: "#333333",
  },
  devFinishText: {
    color: "#666666",
    fontSize: 13,
    fontFamily: F.medium,
  },
  // ── Break screen ─────────────────────────────────────────────────────────────
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
    fontFamily: F.display,
    fontWeight: "800",
    color: C.darkText,
  },
  breakSub: {
    fontSize: 15,
    fontFamily: F.body,
    color: C.darkMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  breakButton: {
    backgroundColor: C.darkText,
    borderRadius: R.full,
    paddingHorizontal: 48,
    paddingVertical: 16,
    minWidth: 160,
    alignItems: "center",
    marginTop: 8,
  },
  breakButtonText: {
    color: C.dark,
    fontSize: 17,
    fontFamily: F.bold,
  },
  // ── Transfer modal ────────────────────────────────────────────────────────────
  modalRoot: {
    flex: 1,
    backgroundColor: C.surface,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: F.bold,
    color: C.text,
  },
  modalDismiss: {
    fontSize: 16,
    fontFamily: F.medium,
    color: C.textSub,
  },
  modalSub: {
    fontSize: 13,
    fontFamily: F.medium,
    color: C.textMuted,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
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
    fontFamily: F.bold,
    color: C.text,
    textAlign: "center",
  },
  emptyButton: {
    backgroundColor: C.indigo,
    borderRadius: R.full,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: C.textInverse,
    fontSize: 15,
    fontFamily: F.bold,
  },
  targetRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 4,
  },
  targetRowPressed: {
    backgroundColor: C.borderLight,
  },
  targetCourse: {
    fontSize: 11,
    fontFamily: F.medium,
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  targetTitle: {
    fontSize: 15,
    fontFamily: F.bold,
    color: C.text,
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: C.borderLight,
    marginHorizontal: 20,
  },
});
