/**
 * @module screens/OnboardingScreen
 * First-launch onboarding carousel shown to every new user.
 *
 * Structure:
 *   Slides 0–2  — value-prop slides with gradient tint backgrounds
 *   Slide 3     — notifications opt-in with value explanation,
 *                 followed by the system permission dialog on iOS
 *
 * On completion the screen calls `onComplete()` which persists the flag
 * in AsyncStorage and triggers a re-render in RootNavigator, routing the
 * user to the main app (MainTabs).
 */

import { useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { C, F, R } from "../theme";

// ── Slide definitions ──────────────────────────────────────────────────────────

type Slide = {
  icon: string;
  title: string;
  body: string;
  /** LinearGradient colors for the slide's tint background. */
  gradient: readonly [string, string];
};

const SLIDES: Slide[] = [
  {
    icon:     "📚",
    title:    "Welcome to Motiff",
    body:     "Your all-in-one academic companion — built for students who want to stay on top of their studies without the chaos.",
    gradient: ["#fff2e6", "#ffe8d6"],
  },
  {
    icon:     "🗂️",
    title:    "Track every course",
    body:     "Add your courses and upload syllabi. Motiff extracts assignments and due dates automatically so nothing slips through.",
    gradient: ["#f0eaff", "#e8dcff"],
  },
  {
    icon:     "⏱️",
    title:    "Focus, then recharge",
    body:     "A built-in Pomodoro timer keeps you in the zone. Set a daily study budget and watch your streaks grow.",
    gradient: ["#fffbe6", "#fff4c2"],
  },
  {
    icon:     "🔔",
    title:    "Never miss a deadline",
    body:     "Enable notifications and Motiff will remind you about upcoming assignments — so you can focus on studying, not remembering.",
    gradient: ["#e6fff5", "#ccf7e8"],
  },
] as const;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LAST_SLIDE = SLIDES.length - 1;

// ── Props ──────────────────────────────────────────────────────────────────────

type Props = {
  /** Called once the user completes or skips onboarding. */
  onComplete: () => Promise<void>;
};

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Horizontal paging carousel that walks the user through Motiff's core value
 * props and requests the iOS notification permission in context on the final slide.
 */
export function OnboardingScreen({ onComplete }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [notifRequested, setNotifRequested] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // ── Navigation ─────────────────────────────────────────────────────────────

  function scrollTo(index: number) {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setActiveIndex(index);
  }

  function handleNext() {
    if (activeIndex < LAST_SLIDE) scrollTo(activeIndex + 1);
  }

  async function handleEnableNotifications() {
    setNotifRequested(true);
    try {
      if (Platform.OS !== "web") {
        await Notifications.requestPermissionsAsync();
      }
    } catch {
      // Non-fatal — proceed to finish onboarding regardless.
    } finally {
      await finish();
    }
  }

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    await onComplete();
  }

  function handleScroll(e: { nativeEvent: { contentOffset: { x: number } } }) {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (index !== activeIndex) setActiveIndex(index);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const isLast = activeIndex === LAST_SLIDE;
  const currentSlide = SLIDES[activeIndex] ?? SLIDES[0]!;

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      {/* Gradient tint covers the whole screen and cross-fades per slide */}
      <LinearGradient
        colors={currentSlide.gradient}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
        pointerEvents="none"
      />

      {/* Skip button */}
      <View style={styles.header}>
        {!isLast ? (
          <Pressable
            onPress={finish}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scroller}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={styles.slide}>
            <Text style={styles.icon}>{slide.icon}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) =>
          i === activeIndex ? (
            <View key={i} style={styles.dotActiveOuter}>
              <LinearGradient
                colors={["#5b3df5", "#ff7a59"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.dotActiveInner}
              />
            </View>
          ) : (
            <View key={i} style={styles.dot} />
          )
        )}
      </View>

      {/* Action area */}
      <View style={styles.actions}>
        {isLast ? (
          <>
            <Pressable
              style={[styles.ctaDepth, (finishing || notifRequested) && styles.buttonDisabled]}
              disabled={finishing || notifRequested}
              onPress={handleEnableNotifications}
              accessibilityRole="button"
              accessibilityLabel="Enable notifications and get started"
            >
              <LinearGradient
                colors={["#7a5cff", "#5b3df5"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Enable notifications</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={finish}
              disabled={finishing}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Skip notifications and get started"
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Maybe later</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={[styles.ctaDepth, finishing && styles.buttonDisabled]}
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel="Next slide"
          >
            <LinearGradient
              colors={["#7a5cff", "#5b3df5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingTop: 8,
    minHeight: 40,
  },
  skipText: {
    fontSize: 15,
    fontFamily: F.medium,
    color: C.indigo,
  },
  scroller: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 20,
  },
  icon: {
    fontSize: 84,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontFamily: F.display,
    fontWeight: "800",
    color: C.ink,
    textAlign: "center",
    lineHeight: 33,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 16,
    fontFamily: F.body,
    color: C.textSub,
    textAlign: "center",
    lineHeight: 24,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#d6d4e8",
  },
  dotActiveOuter: {
    width: 22,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  dotActiveInner: {
    flex: 1,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  ctaDepth: {
    borderRadius: R.lg,
    backgroundColor: "#3a21c4",
  },
  primaryButton: {
    borderRadius: R.lg,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: C.textInverse,
    fontSize: 16,
    fontFamily: F.display,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: F.medium,
    color: C.textMuted,
  },
});
