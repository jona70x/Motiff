# Motiff Mobile UI Kit

Click-thru recreation of the Motiff mobile app. Pixel-level match to `apps/mobile/src/screens/*` (the original codebase) — not a production build; styling is cosmetic.

## Running

Open `index.html` in your browser. The kit is a single React app inside an iPhone frame.

## Files

- `index.html` — the shell. Boots React + Babel, loads `components.jsx`, `screens.jsx`, `ios-frame.jsx`, and a tiny router.
- `components.jsx` — atoms + molecules. Exported to `window`: `C` (color tokens), `fontStack`, `Screen`, `Header`, `SectionHeader`, `PrimaryButton`, `ChipButton`, `SoftChip`, `GhostLink`, `FAB`, `KindBadge`, `AssignmentCard`, `PlanBlockCard`, `CourseCard`, `TextInput`, `TabBar`, `WeekBarChart`.
- `screens.jsx` — full-screen assemblies: `SignInScreen`, `OnboardingScreen`, `TodayScreen`, `PlanScreen`, `CoursesScreen`, `ProgressScreen`, `FocusTimerScreen`.
- `ios-frame.jsx` — iPhone device frame (starter component).

## Coverage

| Screen in app               | In kit | Notes |
|-----------------------------|--------|-------|
| SignInScreen                | ✅     | email/password + closed-beta notice |
| OnboardingScreen            | ✅     | 4-slide carousel with dot pager |
| TodayScreen                 | ✅     | bucketed, undo toast, kind badges |
| PlanScreen                  | ✅     | numbered blocks, urgency colors |
| CoursesScreen               | ✅     | active + completed sections, FAB |
| ProgressScreen              | ✅     | weekly bar chart + by-course breakdown |
| FocusTimerScreen            | ✅     | ring, pause/resume, dark surface |
| SettingsScreen              | ❌     | omitted (form-heavy, low design value) |
| AddCourse / AddAssignment   | ❌     | modal sheets — leave as alerts in this kit |
| SyllabusUpload / Candidates | ❌     | out of scope for this first pass |
| CourseDetail / AssignmentDetail | ❌ | alert stub |
| ForgotPassword / ResetPassword | ❌  | stock forms; reuse SignIn visuals |

## Flow

The kit walks the full happy path:
1. **Sign in** (any input works) → Onboarding
2. **Onboarding** Skip or step through → main tabs
3. **Today / Plan / Courses / Progress** via the bottom tab bar
4. Tap **Start Focus** on any assignment → dark full-screen timer
5. The top quick-jump buttons let you jump directly to any state for review.

## Visual fidelity notes

- Tab icons are the same Unicode placeholders the app uses (`● ▦ ▤ ▨`). Replace with Lucide when iconography is finalized.
- Timer shows a static `24:37` — no real countdown (cosmetic kit).
- Undo toast auto-dismisses after 4s to match the app's `UNDO_DURATION_MS`.
- No animations beyond the stadium dot-pager width transition — Motiff is fade-only in production.
