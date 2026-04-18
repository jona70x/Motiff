import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

export type PomodoroPhase = "idle" | "running" | "paused" | "completed" | "cancelled";

export type PomodoroState = {
  phase: PomodoroPhase;
  remainingMs: number;
  elapsedMs: number;
  startedAt: Date | null;
};

export type PomodoroActions = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  finish: () => void;
};

const DURATION_MS = 25 * 60 * 1000;
const TICK_MS = 500;

export function usePomodoro(): PomodoroState & PomodoroActions {
  const [phase, setPhase] = useState<PomodoroPhase>("idle");
  const [remainingMs, setRemainingMs] = useState(DURATION_MS);

  // Wall-clock refs — no state, so no extra re-renders
  const startedAtRef    = useRef<Date | null>(null);
  const pausedAtRef     = useRef<number | null>(null);  // timestamp when paused
  const accruedPauseMs  = useRef(0);                   // total ms spent paused
  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const getElapsedMs = useCallback(() => {
    if (!startedAtRef.current) return 0;
    const wallMs = Date.now() - startedAtRef.current.getTime() - accruedPauseMs.current;
    return Math.max(0, wallMs);
  }, []);

  const stopTicker = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTicker = useCallback(() => {
    stopTicker();
    intervalRef.current = setInterval(() => {
      const elapsed = getElapsedMs();
      const remaining = Math.max(0, DURATION_MS - elapsed);
      setRemainingMs(remaining);
      if (remaining === 0) {
        stopTicker();
        setPhase("completed");
      }
    }, TICK_MS);
  }, [getElapsedMs, stopTicker]);

  const start = useCallback(() => {
    startedAtRef.current = new Date();
    accruedPauseMs.current = 0;
    pausedAtRef.current = null;
    setRemainingMs(DURATION_MS);
    setPhase("running");
    startTicker();
  }, [startTicker]);

  const pause = useCallback(() => {
    pausedAtRef.current = Date.now();
    stopTicker();
    setPhase("paused");
  }, [stopTicker]);

  const resume = useCallback(() => {
    if (pausedAtRef.current !== null) {
      accruedPauseMs.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setPhase("running");
    startTicker();
  }, [startTicker]);

  const cancel = useCallback(() => {
    stopTicker();
    setPhase("cancelled");
  }, [stopTicker]);

  // Pause timer when app goes to background
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        // record pause time without changing phase to "paused"
        // so we can resume transparently on foreground
        if (phase === "running" && pausedAtRef.current === null) {
          pausedAtRef.current = Date.now();
          stopTicker();
        }
      } else if (nextState === "active") {
        if (phase === "running" && pausedAtRef.current !== null) {
          accruedPauseMs.current += Date.now() - pausedAtRef.current;
          pausedAtRef.current = null;
          startTicker();
        }
      }
    };
    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [phase, startTicker, stopTicker]);

  // Cleanup on unmount
  useEffect(() => () => stopTicker(), [stopTicker]);

  // DEV ONLY: instantly completes the timer for testing
  const finish = useCallback(() => {
    if (!__DEV__) return;
    stopTicker();
    setRemainingMs(0);
    setPhase("completed");
  }, [stopTicker]);

  return {
    phase,
    remainingMs,
    elapsedMs: getElapsedMs(),
    startedAt: startedAtRef.current,
    start,
    pause,
    resume,
    cancel,
    finish,
  };
}
