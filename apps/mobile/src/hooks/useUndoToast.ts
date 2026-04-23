/**
 * @module hooks/useUndoToast
 * Generic undo toast: manages animated visibility + auto-dismiss timer.
 * The calling component supplies its own handleUndo logic — this hook owns
 * only the animation state and the 4-second countdown.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated } from "react-native";

const UNDO_DURATION_MS = 4000;

/**
 * Manages undo toast state, opacity animation, and auto-dismiss timer.
 * T is the "snapshot" type stored while the toast is visible.
 *
 * Usage:
 *   const { undoItem, undoOpacity, showUndoToast, dismissUndo } = useUndoToast<MyItem>();
 *   const handleUndo = useCallback(() => { if (!undoItem) return; ... dismissUndo(); }, [...]);
 */
export function useUndoToast<T>() {
  const [undoItem, setUndoItem] = useState<T | null>(null);
  const undoOpacity = useRef(new Animated.Value(0)).current;
  const undoTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending timer on unmount to prevent state updates on a dead component.
  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  const dismissUndo = useCallback(() => {
    Animated.timing(undoOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
      setUndoItem(null)
    );
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, [undoOpacity]);

  const showUndoToast = useCallback((item: T) => {
    setUndoItem(item);
    Animated.timing(undoOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(dismissUndo, UNDO_DURATION_MS);
  }, [undoOpacity, dismissUndo]);

  return { undoItem, undoOpacity, showUndoToast, dismissUndo };
}
