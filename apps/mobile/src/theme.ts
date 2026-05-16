/** Motiff design tokens — Sprint 5 visual language. */

export const C = {
  // ── Backgrounds ──────────────────────────────────────────────────────────────
  bg:          "#fbfaff",   // app-wide lavender off-white
  surface:     "#ffffff",   // card / modal surface
  surfaceTint: "#f0eeff",   // subtle indigo-tinted surface
  surfaceDim:  "#f7f5ff",   // completed card / dimmed surface

  // ── Primary (Indigo) ─────────────────────────────────────────────────────────
  indigo:      "#4F46E5",
  indigoLight: "#EEF2FF",

  // ── Brand (S5-2 design system) ────────────────────────────────────────────────
  brand:       "#5b3df5",   // brand indigo — course labels, badges, position badge
  brand2:      "#7a5cff",   // brand indigo lighter tint
  chipBg:      "#efeaff",   // soft indigo chip background

  // ── Accent palette ───────────────────────────────────────────────────────────
  peach:       "#FF9F7A",   // "Start Focus" button background
  peachText:   "#5C2400",   // text on peach

  mint:        "#52D9B6",   // "Done" button
  mintBg:      "#E8FDF7",
  mintCheck:   "#2fd19b",   // checkmark icon inside the done circle (S5-2)

  lemon:       "#FFE566",   // floating action button
  lemon2:      "#ffe27a",   // FAB gradient top (S5-3)
  lemonDark:   "#CDB800",
  lemonShadow: "#d9ab1a",   // FAB depth shadow (S5-3)
  lemonText:   "#3D3300",   // text on lemon

  // ── Text ─────────────────────────────────────────────────────────────────────
  ink:         "#1a1633",   // deep indigo ink — primary titles (S5-2)
  text:        "#111827",
  textSub:     "#6B7280",
  textMuted:   "#9CA3AF",
  textInverse: "#ffffff",
  tabInactive: "#adaacc",   // inactive tab icon/label (S5-3)

  // ── Borders ──────────────────────────────────────────────────────────────────
  border:      "#E5E7EB",
  borderLight: "#F3F4F6",
  cardBorder:  "rgba(91,61,245,0.08)",  // S5-2 card border tint
  doneBorder:  "#d6d4e8",               // done circle border (S5-2)

  // ── Card typography helpers (S5-2) ────────────────────────────────────────────
  timeText:    "#6b6690",   // est/allocated-time label and time chip text
  progNote:    "#9793b8",   // progress note text (focused min, percentage)

  // ── Urgency rails (left border on cards) ─────────────────────────────────────
  railOverdue: "#EF4444",
  railToday:   "#F97316",
  railWeek:    "#4F46E5",
  railLater:   "#D1D5DB",

  // ── Kind badge colors (S5-2) ──────────────────────────────────────────────────
  badgeExamBg:        "#ffe4ea",
  badgeExamText:      "#b0002e",
  badgeAssignBg:      "#e3f2fd",
  badgeAssignText:    "#1565c0",
  badgeProjBg:        "#efeaff",
  badgeProjText:      "#5b3df5",
  badgeReadBg:        "#d8f5e8",
  badgeReadText:      "#1f9a72",

  // ── Due-date pill colors (S5-2) ───────────────────────────────────────────────
  pillOverdueBg:      "#ffe4ea",
  pillOverdueText:    "#b0002e",
  pillOverdueDot:     "#ff3d6b",
  pillTodayBg:        "#fff2e6",
  pillTodayText:      "#c85418",
  pillTodayDot:       "#ff7a59",
  pillWeekBg:         "#fff7d6",
  pillWeekText:       "#8a6b00",
  pillWeekDot:        "#ffba17",
  pillLaterBg:        "#efeaff",
  pillLaterText:      "#5b3df5",
  pillLaterDot:       "#7a5cff",

  // ── Status ───────────────────────────────────────────────────────────────────
  error:         "#DC2626",
  errorBg:       "#FEF2F2",
  errorBorder:   "#FECACA",   // light red border (danger card outline)
  warning:       "#D97706",
  warningBg:     "#FFFBEB",
  warningBorder: "#FDE68A",   // warm yellow border (warning banner bottom line)
  success:       "#059669",
  successBg:     "#ECFDF5",

  // ── Dark (FocusTimer) ────────────────────────────────────────────────────────
  dark:       "#0a0a0a",
  darkMuted:  "#8E8E93",
  darkText:   "#ffffff",
} as const;

export const R = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 999,
} as const;

export const shadow = {
  card: {
    shadowColor:   "#4F46E5",
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius:  8,
    elevation:     2,
  },
  float: {
    shadowColor:   "#4F46E5",
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius:  16,
    elevation:     8,
  },
  s5card: {
    shadowColor:   "#1a1633",
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius:  18,
    elevation:     3,
  },
  focusBtn: {
    shadowColor:   "#d4512e",
    shadowOffset:  { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius:  0,
    elevation:     3,
  },
  doneBtn: {
    shadowColor:   "#1f9a72",
    shadowOffset:  { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius:  0,
    elevation:     3,
  },
  posBadge: {
    shadowColor:   "#3a21c4",
    shadowOffset:  { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius:  0,
    elevation:     3,
  },
  tabBar: {
    shadowColor:   "#5b3df5",
    shadowOffset:  { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius:  28,
    elevation:     10,
  },
  fab: {
    shadowColor:   "#d9ab1a",
    shadowOffset:  { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius:  0,
    elevation:     5,
  },
} as const;

/** Gradient color pairs for expo-linear-gradient (S5-2). */
export const G = {
  railOverdue:  ["#ff3d6b", "#b0002e"] as [string, string],
  railToday:    ["#ff7a59", "#ff5e36"] as [string, string],
  railWeek:     ["#ffd447", "#ffba17"] as [string, string],
  railLater:    ["#7a5cff", "#5b3df5"] as [string, string],
  focusPeach:   ["#ff9578", "#ff7a59"] as [string, string],
  mintDone:     ["#5de5b5", "#2fd19b"] as [string, string],
  posBadge:     ["#7a5cff", "#5b3df5"] as [string, string],
  progFill:     ["#5b3df5", "#ff7a59"] as [string, string],
  lemonFab:     ["#ffe27a", "#ffd447"] as [string, string],
} as const;

/**
 * Standard press-state opacity for Pressable components.
 * Use as: style={({ pressed }) => [styles.foo, pressed && styles.pressed]}
 * where styles.pressed = { opacity: PRESS_OPACITY }
 */
export const PRESS_OPACITY = 0.7;

/** Font family names loaded by App.tsx via expo-google-fonts. */
export const F = {
  body:    "Nunito_400Regular",
  medium:  "Nunito_600SemiBold",
  bold:    "Nunito_700Bold",
  xbold:   "Nunito_800ExtraBold",
  display: "BricolageGrotesque_700Bold",
} as const;
