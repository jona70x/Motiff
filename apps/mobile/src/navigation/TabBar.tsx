/**
 * @module navigation/TabBar
 * S5-3 floating pill tab bar with Lucide SVG icons and lemon FAB.
 *
 * Layout (bottom of screen):
 *
 *                    [  +  ]   ← lemon FAB (AddCourse)
 *   ┌───────────────────────────────────────────┐
 *   │  Today   Plan   Courses   Progress        │  ← floating pill
 *   └───────────────────────────────────────────┘
 *
 * Active tab: indigo chip (#efeaff, borderRadius 14) + peach dot indicator.
 * Inactive tab: #adaacc icon/label.
 * FAB: lemon LinearGradient (#ffe27a → #ffd447) with depth shadow.
 */

import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Icons } from "../lib/icons";
import { C, F, G, R, shadow } from "../theme";

const TAB_ICONS = {
  Today:    Icons.today,
  Plan:     Icons.plan,
  Courses:  Icons.courses,
  Progress: Icons.progress,
} as const;

type TabName = keyof typeof TAB_ICONS;

/** S5-3 floating pill tab bar with lemon FAB. */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  function handleFab() {
    navigation.navigate("AddCourse");
  }

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom || 12 }]}>
      {/* Lemon FAB — floats above the pill */}
      <Pressable
        style={({ pressed }) => [styles.fabWrap, pressed && styles.fabPressed]}
        onPress={handleFab}
        accessibilityRole="button"
        accessibilityLabel="Add course"
      >
        <LinearGradient
          colors={G.lemonFab}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.fab}
        >
          <Icons.add size={24} color={C.ink} strokeWidth={2.5} />
        </LinearGradient>
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
                  color={focused ? C.indigo : C.tabInactive}
                  strokeWidth={focused ? 2.4 : 2}
                />
                {focused && <View style={styles.dot} />}
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
    backgroundColor: "transparent",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  fabWrap: {
    marginBottom: 10,
    borderRadius: R.full,
    ...shadow.fab,
  },
  fab: {
    width:          58,
    height:         58,
    borderRadius:   R.full,
    alignItems:     "center",
    justifyContent: "center",
  },
  fabPressed: {
    opacity: 0.88,
  },
  pill: {
    flexDirection:    "row",
    backgroundColor:  C.surface,
    borderRadius:     22,
    paddingHorizontal: 6,
    paddingVertical:   8,
    marginHorizontal: 16,
    marginBottom:     8,
    alignSelf:        "stretch",
    ...shadow.tabBar,
  },
  tab: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    gap:            3,
    paddingVertical: 4,
  },
  tabIndicator: {
    width:          44,
    height:         34,
    borderRadius:   14,
    alignItems:     "center",
    justifyContent: "center",
  },
  tabIndicatorActive: {
    backgroundColor: C.chipBg,
  },
  dot: {
    position:     "absolute",
    top:          4,
    right:        14,
    width:        6,
    height:       6,
    borderRadius: R.full,
    backgroundColor: C.peach,
  },
  tabLabel: {
    fontSize:   11,
    fontFamily: F.xbold,
    color:      C.tabInactive,
  },
  tabLabelActive: {
    color: C.indigo,
  },
});
