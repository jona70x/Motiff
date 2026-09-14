# Motiff Design System

Motiff is a mobile app for students who want to stay on top of coursework without the chaos. Upload a syllabus, Motiff extracts assignments automatically, and a daily plan prioritizes what to work on. A built-in Pomodoro-style focus timer keeps study sessions honest, and a weekly progress view rewards streaks.

This design system captures Motiff's visual + content language so new surfaces (landing pages, slides, mocks, new screens) stay coherent with the product.

## Product at a glance

- **Single product — iOS/Android mobile app** built with Expo + React Native 0.81 + TypeScript.
- **Closed beta**, invite-only (Supabase Auth admin invites; email + password).
- **4 main tabs:** Today, Plan, Courses, Progress.
- **Modal flows:** Add Course, Add Assignment, Syllabus Upload → Candidates, Focus Timer, Settings, Onboarding.
- **Analytics:** PostHog. **Errors:** Sentry. **Backend:** Supabase (Auth, DB, Storage, Edge Functions).

## Sources

Everything in this folder was derived from the following, all mounted via File System Access:

- `apps/mobile/` — Expo app, package `@motiff/mobile` (primary source of truth for visuals & copy)
  - `src/screens/*` — TodayScreen, PlanScreen, CoursesScreen, ProgressScreen, FocusTimerScreen, OnboardingScreen, SignInScreen, SettingsScreen, AddCourseScreen, AddAssignmentScreen, CourseDetailScreen, AssignmentDetailScreen, SyllabusUploadScreen, SyllabusCandidatesScreen, ForgotPasswordScreen, ResetPasswordScreen
  - `src/components/` — AssignmentCard, PlanBlockCard, WeekBarChart
  - `src/navigation/RootNavigator.tsx` — navigation tree
  - `apps/mobile/app.json` — brand config (icon, splash, notification color `#111111`)
- `apps/mobile/assets/` — icon/splash PNGs (**placeholder art** — grid-and-circles template, not finalized)

Additional linked packages are referenced from the app but not required reading for design: `packages/domain/plan/generator`, `packages/domain/progress/summary`.

## Index — what's in this folder

- `README.md` — you are here
- `SKILL.md` — cross-compatible Agent Skills manifest; invoke to start a design task
- `colors_and_type.css` — CSS variables for color + type, plus semantic selectors
- `assets/` — logos, icons, raster images lifted from the product
- `fonts/` — webfonts (flagged where we substituted)
- `preview/` — small HTML cards that populate the Design System tab
- `ui_kits/mobile/` — React JSX recreation of the mobile app (click-thru prototype)

## CONTENT FUNDAMENTALS

Motiff's voice is **calm, honest, and practical**. It sounds like a competent friend who took good notes — not a hype coach, not a parent, not a chatty mascot.

### Rules

- **Sentence case everywhere.** Buttons, titles, section headers, labels — all sentence case. Even multi-word CTAs: `Start Focus`, `Go to Courses`, `Enable notifications`, `Mark as completed`.
- **Short titles, short buttons.** 1–3 words on buttons. Screen titles are a single word when possible: `Today`, `Plan`, `Courses`, `Progress`.
- **Uppercase labels for meta, with letter-spacing 0.5.** Course names on cards, section labels (`TODAY`, `THIS WEEK`, `LATER`, `ACTIVE`, `COMPLETED`), card labels (`THIS WEEK`, `ASSIGNMENTS`, `BY COURSE`). Font size 11–12, weight 600–700, color mid-gray.
- **You, not I.** Direct address. "Your all-in-one academic companion", "Add your first course", "so you can focus on studying, not remembering."
- **No exclamation points in UI chrome.** Reserved for genuine celebration copy only (`Session complete!` on the break screen).
- **Empty states explain then act.** Two lines + a CTA. e.g. "Add your first course" / "Tap the + button to add a course. Upload your syllabus and Motiff will extract assignments automatically." / `[Add a course]`
- **Destructive confirmation is literal.** "`\"Intro to Psych\"` and all its assignments and syllabi will be permanently deleted. This cannot be undone." — quote the thing being deleted; spell out what cascades; end with finality.
- **Error copy is apologetic but actionable.** "Failed to mark done. Please try again." / "Plan generated but couldn't be saved — check your connection."
- **Undo toasts use past tense + noun + verb:** "Marked as done" + `Undo`. Not "You marked X as done."

### Vocabulary we use

- **Course** (not class, subject, or module)
- **Assignment** (not task, to-do, or item). Kinds: `exam`, `assignment`, `project`, `reading`, `other`.
- **Syllabus** (singular) / **Syllabi** (plural)
- **Focus** and **Focus session** (not study session, Pomodoro, deep work)
- **Plan** (the verb for generating the daily list; also the noun for the tab)
- **Budget** (daily minutes — "Daily budget", "20 min budget")
- **Streak** (progress concept, not gamified loudly)
- **Bucket** (internal; users see `Today / This week / Later`)

### Emoji

Used **sparingly and only on decorative / emotional surfaces** — onboarding slides (`📚 🗂️ ⏱️ 🔔`), the focus-complete break (`🎉`), the empty Courses state (`🗂️`). Never inside data cards, buttons, or chrome. The system does **not** use emoji as category icons.

### Tone examples (lifted verbatim from the app)

- Onboarding slide 1: "Welcome to Motiff" / "Your all-in-one academic companion — built for students who want to stay on top of their studies without the chaos."
- Onboarding slide 3: "Focus, then recharge" / "A built-in Pomodoro timer keeps you in the zone. Set a daily study budget and watch your streaks grow."
- Sign-in subtitle: "Sign in to continue"
- Closed-beta banner: "Motiff is currently invite-only. If you received an invite email, tap the link in that email to set your password and sign in."
- Plan header: "Prioritised by urgency · 90 min budget"
- Empty Plan: "Nothing to plan" / "Add assignments to your courses and they'll appear here in priority order."
- Empty Progress: "No focus sessions yet" / "Start a focus session from Today to see your progress here."

Note: the codebase uses British spelling in one place (`"Prioritised"`) and American elsewhere. We standardize on **American English** going forward; keep the one British instance if recreating that exact screen.

## VISUAL FOUNDATIONS

Motiff's look is **quiet, high-contrast monochrome with crisp card geometry**. The design is restrained on purpose: students are already juggling a lot, so the app avoids competing for attention with color, gradient, or ornament. Accents appear only where they earn their keep — due-date urgency, assignment-kind tagging, the Focus Timer.

### Palette

Monochrome first — `#111` for foreground, `#fff` for surfaces, `#f6f6f8` for the app background. Grays step from `#888` → `#555` → `#333` for hierarchy. Borders are `#e0e0e6`.

Semantic accents are muted, slightly dusty (not saturated):

- **Red** `#b00020` — overdue, errors, destructive
- **Orange** `#e65100` — due today
- **Blue** `#1565c0` — due this week / `assignment` kind badge
- **Deep purple** `#6a1b9a` — `project` kind badge
- **Green** `#2e7d32` — `reading` kind badge
- **Link blue** `#3355cc` — inline text links ("Forgot password?", "Skip")
- **Focus-timer resume blue** `#3355cc` on `#0a0a0a` background
- Warning/caution: `#fff8e1` bg + `#795548` text, `#ffe082` border

### Typography

**System font stack** — SF Pro on iOS, Roboto on Android. No custom webfont is shipped. For web recreations we use `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif`. Numeric timers use `fontVariant: ["tabular-nums"]`.

Scale, observed:

- `32 / 700` — sign-in title
- `28 / 700` — tab screen titles (Today, Plan, Courses, Progress)
- `26 / 700` — onboarding slide title, break-screen title
- `18 / 600–700` — empty-state title, modal title
- `17 / 700` — focus-timer primary button
- `16 / 600` — course titles, primary button text
- `15 / 600` — assignment titles, CTA button text
- `14 / 500–600` — body copy, secondary button
- `13 / 500–600` — metadata, error banners
- `12 / 600–700` — due labels, time labels, card labels (often uppercase)
- `11 / 600` — course labels on cards, section labels (uppercase, letter-spacing 0.5)

Line heights cluster around 1.3–1.5 for body; titles tighten to ~1.2.

### Spacing & rhythm

Paddings cluster around **6 · 8 · 12 · 14 · 16 · 20 · 24 · 32**. Cards use `padding: 14` with `gap: 6–8`. Screen horizontal padding is `20` for headers, `16` for card gutters. Tab screen headers are `paddingHorizontal 20 / paddingVertical 16` on a white strip above the `#f6f6f8` scroll body.

### Corner radii

- `4` — small kind badges (pill-ish)
- `6` — inline chips, small action buttons (`Start Focus`)
- `8` — primary buttons, inputs, banners
- `10` — undo toast
- `12` — cards (assignment, plan-block, course, progress)
- `14` — number badges (plan position)
- `16` / `28` — circular done-check / FAB
- `30` — focus-timer pill buttons
- `110` — focus-timer ring (fully round)

### Borders, shadows, elevation

- Cards use **1px border, no shadow** — `borderColor: #e0e0e6` on white. The hairline is the whole elevation story.
- The only shadow in the product is on the FAB: `shadowColor: #000, offset (0,2), opacity 0.25, radius 3.84, elevation 5`. Everything else sits flat.
- Completed / dimmed cards drop to `backgroundColor: #fafafa, borderColor: #e8e8ee`.

### Backgrounds & imagery

- No photographs. No illustrations (other than onboarding emoji).
- No gradients. No mesh. No blur. No texture.
- The Focus Timer switches to a near-black `#0a0a0a` full-bleed surface with a 4px white ring — this is the one "mode change" in the app and it is intentional.

### Motion

- **Fades only.** Undo toast fades in 200ms, out 200ms. No bounces, no springs, no staggered entrances.
- `Pressable` uses `opacity: 0.7` on press for cards and rows.
- Onboarding carousel pages via native `ScrollView` paging — no custom easing.
- Timer ring is static; the number counts down. No animated arc.
- Active tab-bar dot indicator grows from `8px` to `20px` wide (stadium) when selected.

### Interaction states

- **Press:** `opacity: 0.7` (cards, rows) or darker background fill (targets). Buttons don't scale.
- **Hover:** N/A (mobile). For web recreations treat as `opacity: 0.85`.
- **Disabled:** `opacity: 0.5` on the whole element. No color shift.
- **Destructive:** red text `#b00020`, confirmed via native alert; never red buttons.
- **Focus ring:** none custom; system defaults.

### Layout rules

- Fixed top header on every tab screen — white, 1px bottom border, screen title at `28/700`.
- FAB (`+`) bottom-right with `24` inset, only on Courses.
- Bottom tab bar with 4 tabs — icons are currently single-char Unicode glyphs (`●`, `▦`, `▤`, `▨`). **This is a temporary placeholder**; see `ICONOGRAPHY`.
- Sheet modals (Add Course, Add Assignment) use iOS `presentation: "modal"`.
- Lists are `FlatList` or `ScrollView` with `RefreshControl` — always pull-to-refresh.

### Transparency & blur

Not used. All surfaces are fully opaque. No glassmorphism.

### Color vibe of imagery

No photography. If imagery is added later, we'd lean **warm, desaturated, with grain** — consistent with the calm-and-honest voice. Avoid neon, avoid saturated tech-blue gradients. Bias toward book/desk/notebook still-lifes over people-in-action.

## ICONOGRAPHY

The codebase **does not ship an icon system today**. What exists:

- **Tab bar icons** are single Unicode glyphs rendered as `<Text>`: `●` (Today), `▦` (Plan), `▤` (Courses), `▨` (Progress). Clearly a stand-in.
- **Action glyphs inline in text** where the designer wanted *something*: `↺` regenerate, `⚙` settings, `◷` clock/allocated-minutes, `✓` done-check, `▾ ▸` expand/collapse, `+` FAB, `•••` row overflow.
- **Emoji** on decorative surfaces only (onboarding, break screen, empty state).
- **No SVG icon files**, **no icon font**, **no Lucide/Heroicons import**, **no @expo/vector-icons usage**.

**Recommendation (flagged substitution):** for any recreation or new surface, use **[Lucide](https://lucide.dev/)** via CDN — thin strokes, rounded-ish but not too playful, aligns with Motiff's restrained aesthetic. Suggested mapping:

| Motiff usage              | Unicode in code | Lucide substitute       |
| ------------------------- | --------------- | ----------------------- |
| Today tab                 | `●`             | `calendar-check-2`      |
| Plan tab                  | `▦`             | `list-ordered`          |
| Courses tab               | `▤`             | `library`               |
| Progress tab              | `▨`             | `bar-chart-3`           |
| Regenerate                | `↺`             | `refresh-cw`            |
| Settings                  | `⚙`             | `settings`              |
| Allocated minutes         | `◷`             | `clock`                 |
| Done / checkmark          | `✓`             | `check`                 |
| Expand / collapse         | `▾ ▸`           | `chevron-down/right`    |
| Add                       | `+`             | `plus`                  |
| Row overflow              | `•••`           | `more-horizontal`       |

CDN: `https://unpkg.com/lucide@latest/dist/umd/lucide.js`. Strokes at `1.75px` at 20–24px render size.

## Logos

Motiff has **no finalized logo**. The Expo icon + splash in `apps/mobile/assets/` are the generic grid-and-concentric-circles template. We captured them in `assets/` for the record, but **do not use them in marketing designs**. Flagged for the user — see CAVEATS at the bottom.

For recreations, use the wordmark treatment from the sign-in screen: `Motiff` at `32/700`, centered, `#111`. That is effectively the logo today.

---

_Last updated 2026-04-21. Questions, corrections, requests for new components → flag in the parent project._
