/** Motiff design tokens — Sprint 5 visual language. */

export const C = {
  // ── Backgrounds ──────────────────────────────────────────────────────────────
  bg:          "#fbfaff",   // app-wide lavender off-white
  surface:     "#ffffff",   // card / modal surface
  surfaceTint: "#f0eeff",   // subtle indigo-tinted surface

  // ── Primary (Indigo) ─────────────────────────────────────────────────────────
  indigo:      "#4F46E5",
  indigoLight: "#EEF2FF",

  // ── Accent palette ───────────────────────────────────────────────────────────
  peach:       "#FF9F7A",   // "Start Focus" button background
  peachText:   "#5C2400",   // text on peach

  mint:        "#52D9B6",   // "Done" button
  mintBg:      "#E8FDF7",

  lemon:       "#FFE566",   // floating action button
  lemonDark:   "#CDB800",
  lemonText:   "#3D3300",   // text on lemon

  // ── Text ─────────────────────────────────────────────────────────────────────
  text:        "#111827",
  textSub:     "#6B7280",
  textMuted:   "#9CA3AF",
  textInverse: "#ffffff",

  // ── Borders ──────────────────────────────────────────────────────────────────
  border:      "#E5E7EB",
  borderLight: "#F3F4F6",

  // ── Urgency rails (left border on cards) ─────────────────────────────────────
  railOverdue: "#EF4444",
  railToday:   "#F97316",
  railWeek:    "#4F46E5",
  railLater:   "#D1D5DB",

  // ── Status ───────────────────────────────────────────────────────────────────
  error:     "#DC2626",
  errorBg:   "#FEF2F2",
  warning:   "#D97706",
  warningBg: "#FFFBEB",
  success:   "#059669",
  successBg: "#ECFDF5",

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
} as const;

/** Font family names loaded by App.tsx via expo-google-fonts. */
export const F = {
  body:    "Nunito_400Regular",
  medium:  "Nunito_600SemiBold",
  bold:    "Nunito_700Bold",
  xbold:   "Nunito_800ExtraBold",
  display: "BricolageGrotesque_700Bold",
} as const;
