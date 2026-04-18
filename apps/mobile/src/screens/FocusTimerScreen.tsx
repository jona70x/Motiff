import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { usePomodoro } from "../hooks/usePomodoro";
import { createFocusSession } from "../lib/api/sessions";
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

  const { phase, remainingMs, elapsedMs, startedAt, start, pause, resume, cancel } =
    usePomodoro();

  const [showBreak, setShowBreak] = useState(false);
  const sessionWritten = useRef(false);

  // Start timer immediately on mount
  useEffect(() => {
    start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const writeSession = useCallback(
    async (outcome: "completed" | "cancelled" | "paused_ended", durationMs: number) => {
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
        // session write is best-effort; don't block the UX
      }
    },
    [assignmentId, startedAt]
  );

  // When timer completes
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

  // ── Break screen ────────────────────────────────────────────────────────────
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
      </View>
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
});
