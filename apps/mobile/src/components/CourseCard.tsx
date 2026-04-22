/**
 * @module components/CourseCard
 * S5-2 course card: Bricolage title, surfaceDim background when completed,
 * MoreHorizontal icon for the action menu trigger.
 */

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { Course } from "../lib/schema";
import { Icons } from "../lib/icons";
import { C, F, R, shadow } from "../theme";

// ── Types ──────────────────────────────────────────────────────────────────────

export type CourseCardProps = {
  course: Course;
  /** True while a delete or complete operation is in progress for this course. */
  isBusy: boolean;
  onPress: () => void;
  /** Called when the user taps the ⋯ menu icon. */
  onMenu: () => void;
};

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * CourseCard renders a single course row in the Courses screen.
 * Completed courses use a dimmed surface and muted title text.
 */
export function CourseCard({ course, isBusy, onPress, onMenu }: CourseCardProps) {
  const isCompleted      = !!course.completed_at;
  const MoreHorizontalIcon = Icons.moreHorizontal;

  return (
    <Pressable
      style={[styles.card, isCompleted && styles.cardCompleted]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${course.title}${isCompleted ? ", completed" : ""}`}
    >
      <View style={styles.body}>
        <Text
          style={[styles.title, isCompleted && styles.titleCompleted]}
          numberOfLines={2}
        >
          {course.title}
        </Text>
        {course.term ? (
          <Text style={styles.term}>{course.term}</Text>
        ) : null}
        {isCompleted ? (
          <Text style={styles.completedLabel}>
            Completed {new Date(course.completed_at!).toLocaleDateString()}
          </Text>
        ) : null}
      </View>

      {isBusy ? (
        <ActivityIndicator size="small" color={C.textMuted} style={styles.menuTrigger} />
      ) : (
        <Pressable
          style={styles.menuTrigger}
          onPress={onMenu}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Course options"
        >
          <MoreHorizontalIcon size={20} color={C.textMuted} />
        </Pressable>
      )}
    </Pressable>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flexDirection:    "row",
    alignItems:       "center",
    marginHorizontal: 16,
    marginVertical:   5,
    paddingHorizontal: 16,
    paddingVertical:  14,
    backgroundColor:  C.surface,
    borderRadius:     18,
    borderWidth:      1,
    borderColor:      C.cardBorder,
    ...shadow.s5card,
  },
  cardCompleted: {
    backgroundColor: C.surfaceDim,
  },
  body: {
    flex: 1,
    gap:  3,
  },
  title: {
    fontFamily: F.display,
    fontSize:   17,
    color:      C.ink,
    lineHeight: 22,
  },
  titleCompleted: {
    color: C.textMuted,
  },
  term: {
    fontSize:   13,
    fontFamily: F.body,
    color:      C.textSub,
  },
  completedLabel: {
    fontSize:   11,
    fontFamily: F.medium,
    color:      C.textMuted,
    marginTop:  2,
  },
  menuTrigger: {
    padding:    8,
    marginLeft: 8,
  },
});
