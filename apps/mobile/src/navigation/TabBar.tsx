/**
 * @module navigation/TabBar
 * Floating pill-shaped tab bar with Lucide icons and a lemon FAB overlay.
 *
 * Layout (bottom of screen):
 *
 *                    [ + ]   ← lemon FAB (AddCourse)
 *   ┌────────────────────────────────────────┐
 *   │  Today   Plan   Courses   Progress     │  ← floating pill
 *   └────────────────────────────────────────┘
 */

import { Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Icons } from "../lib/icons";
import { C, F, R, shadow } from "../theme";

const TAB_ICONS = {
  Today:    Icons.today,
  Plan:     Icons.plan,
  Courses:  Icons.courses,
  Progress: Icons.progress,
} as const;

type TabName = keyof typeof TAB_ICONS;

/** Custom floating tab bar with Lucide icons and a lemon FAB that opens an add action sheet. */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [fabOpen, setFabOpen] = useState(false);

  function handleFabAction(screen: "AddAssignment" | "AddCourse") {
    setFabOpen(false);
    navigation.navigate(screen);
  }

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom || 12 }]}>
      {/* Dismiss backdrop */}
      {fabOpen && (
        <Pressable style={styles.backdrop} onPress={() => setFabOpen(false)} />
      )}

      {/* Action sheet card */}
      {fabOpen && (
        <View style={styles.actionSheet}>
          <Pressable
            style={styles.actionRow}
            onPress={() => handleFabAction("AddAssignment")}
            accessibilityRole="button"
          >
            <Icons.check size={18} color={C.indigo} strokeWidth={2} />
            <Text style={styles.actionLabel}>Add Assignment</Text>
          </Pressable>
          <View style={styles.actionDivider} />
          <Pressable
            style={styles.actionRow}
            onPress={() => handleFabAction("AddCourse")}
            accessibilityRole="button"
          >
            <Icons.courses size={18} color={C.indigo} strokeWidth={2} />
            <Text style={styles.actionLabel}>Add Course</Text>
          </Pressable>
        </View>
      )}

      {/* Lemon FAB — floats above the pill */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => setFabOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel="Add assignment or course"
      >
        <Icons.add size={22} color={C.lemonText} strokeWidth={2.5} />
      </Pressable>

      {/* Floating pill */}
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]!;
          const focused = state.index === index;
          const IconComponent = TAB_ICONS[route.name as TabName] ?? Icons.today;

          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : route.name;

          function handlePress() {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }

          return (
            <Pressable
              key={route.key}
              style={styles.tab}
              onPress={handlePress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
            >
              <View style={[styles.tabIndicator, focused && styles.tabIndicatorActive]}>
                <IconComponent
                  size={22}
                  color={focused ? C.indigo : C.textMuted}
                  strokeWidth={focused ? 2.2 : 1.8}
                />
              </View>
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    paddingTop: 0,
    backgroundColor: "transparent",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  backdrop: {
    position: "absolute",
    top: -9999,
    left: -9999,
    right: -9999,
    bottom: -9999,
  },
  actionSheet: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    marginBottom: 10,
    ...shadow.float,
    overflow: "hidden",
    minWidth: 200,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionLabel: {
    fontSize: 15,
    fontFamily: F.medium,
    color: C.text,
  },
  actionDivider: {
    height: 1,
    backgroundColor: C.borderLight,
    marginHorizontal: 16,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: R.full,
    backgroundColor: C.lemon,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    ...shadow.float,
  },
  fabPressed: {
    backgroundColor: C.lemonDark,
    opacity: 0.9,
  },
  pill: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: R.full,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginHorizontal: 24,
    alignSelf: "stretch",
    ...shadow.float,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 4,
  },
  tabIndicator: {
    width: 40,
    height: 32,
    borderRadius: R.full,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIndicatorActive: {
    backgroundColor: C.indigoLight,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: F.medium,
    color: C.textMuted,
  },
  tabLabelActive: {
    color: C.indigo,
    fontFamily: F.bold,
  },
});
