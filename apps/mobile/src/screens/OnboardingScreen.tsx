/**
 * @module screens/OnboardingScreen
 * First-launch onboarding carousel shown to every new user.
 *
 * Structure:
 *   Slides 0–2  — value-prop slides (auto-advance or swipe)
 *   Slide 3     — notifications opt-in with value explanation,
 *                 followed by the system permission dialog on iOS
 *
 * On completion the screen calls `onComplete()` which persists the flag
 * in AsyncStorage and triggers a re-render in RootNavigator, routing the
 * user to the main app (MainTabs).
 *
 * The user can skip at any point — they land in the main app without
 * enabling notifications. They can always enable later via Settings.
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
import * as Notifications from "expo-notifications";

// ── Slide definitions ──────────────────────────────────────────────────────────

type Slide = {
  icon: string;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    icon: "📚",
    title: "Welcome to Motiff",
    body: "Your all-in-one academic companion — built for students who want to stay on top of their studies without the chaos.",
  },
  {
    icon: "🗂️",
    title: "Track every course",
    body: "Add your courses and upload syllabi. Motiff extracts assignments and due dates automatically so nothing slips through.",
  },
  {
    icon: "⏱️",
    title: "Focus, then recharge",
    body: "A built-in Pomodoro timer keeps you in the zone. Set a daily study budget and watch your streaks grow.",
  },
  {
    icon: "🔔",
    title: "Never miss a deadline",
    body: "Enable notifications and Motiff will remind you about upcoming assignments — so you can focus on studying, not remembering.",
  },
];

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
    if (activeIndex < LAST_SLIDE) {
      scrollTo(activeIndex + 1);
    }
  }

  async function handleEnableNotifications() {
    setNotifRequested(true);
    try {
      // Request the system permission. On iOS this shows the native dialog.
      // On Android 13+ it also shows a dialog; earlier versions grant automatically.
      // We do not store the result — the app checks permission status at use-time.
      if (Platform.OS !== "web") {
        await Notifications.requestPermissionsAsync();
      }
    } catch {
      // Permission request can fail if the notifications module is unavailable
      // (e.g. in a bare Expo Go build without native rebuild). Not fatal —
      // proceed to finish onboarding regardless.
    } finally {
      await finish();
    }
  }

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    await onComplete();
  }

  // ── Scroll sync ─────────────────────────────────────────────────────────────

  function handleScroll(e: { nativeEvent: { contentOffset: { x: number } } }) {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (index !== activeIndex) setActiveIndex(index);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const isLast = activeIndex === LAST_SLIDE;

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      {/* Skip button — always visible except on the last slide (replaced by "Get started") */}
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
          /* Placeholder to keep header height consistent */
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
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* Action area */}
      <View style={styles.actions}>
        {isLast ? (
          <>
            <Pressable
              style={[styles.primaryButton, finishing && styles.buttonDisabled]}
              disabled={finishing || notifRequested}
              onPress={handleEnableNotifications}
              accessibilityRole="button"
              accessibilityLabel="Enable notifications and get started"
            >
              <Text style={styles.primaryButtonText}>Enable notifications</Text>
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
            style={styles.primaryButton}
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel="Next slide"
          >
            <Text style={styles.primaryButtonText}>Next</Text>
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
    backgroundColor: "#f6f6f8",
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
    color: "#3355cc",
    fontWeight: "500",
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
    fontSize: 80,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    lineHeight: 34,
  },
  body: {
    fontSize: 16,
    color: "#555",
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
    backgroundColor: "#d6d6dc",
  },
  dotActive: {
    backgroundColor: "#111",
    width: 20,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#111",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    color: "#888",
  },
});
