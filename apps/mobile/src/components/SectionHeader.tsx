/**
 * @module components/SectionHeader
 * Shared uppercase section header with optional count pill and optional
 * pressable wrapper (used by collapsible sections).
 */

import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, F, R } from "../theme";

type Props = {
  title: string;
  count?: number;
  /** When provided the entire header row becomes a Pressable. */
  onPress?: () => void;
  /** Rendered to the left of the title (e.g. a chevron icon). */
  leftAdornment?: ReactNode;
};

/** Uppercase section label with an optional indigo count pill. */
export function SectionHeader({ title, count, onPress, leftAdornment }: Props) {
  const content = (
    <>
      <View style={styles.left}>
        {leftAdornment}
        <Text style={styles.title}>{title}</Text>
      </View>
      {count !== undefined && (
        <View style={styles.pill}>
          <Text style={styles.pillText}>{count}</Text>
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
        {content}
      </Pressable>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    paddingHorizontal: 20,
    paddingTop:     16,
    paddingBottom:  8,
  },
  left: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  title: {
    fontSize:      13,
    fontFamily:    F.bold,
    color:         C.textSub,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  pill: {
    backgroundColor: C.indigoLight,
    borderRadius:    R.full,
    paddingHorizontal: 8,
    paddingVertical:   2,
    minWidth:        24,
    alignItems:      "center",
  },
  pillText: {
    fontSize:   12,
    fontFamily: F.bold,
    color:      C.indigo,
  },
});
