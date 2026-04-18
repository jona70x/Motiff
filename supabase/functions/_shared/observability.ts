// Minimal Sentry + PostHog reporters for Supabase Edge Functions.
// Uses fetch directly — no SDK — to avoid runtime compatibility issues.

const SENTRY_DSN   = Deno.env.get("SENTRY_DSN_EDGE")   ?? "";
const POSTHOG_KEY  = Deno.env.get("POSTHOG_API_KEY")   ?? "";
const POSTHOG_HOST = Deno.env.get("POSTHOG_HOST")      ?? "https://us.i.posthog.com";

// ── Sentry ────────────────────────────────────────────────────────────────────

function parseDsn(dsn: string): { url: string; key: string; projectId: string } | null {
  try {
    const u = new URL(dsn);
    const key = u.username;
    const projectId = u.pathname.replace("/", "");
    const url = `${u.protocol}//${u.host}/api/${projectId}/store/`;
    return { url, key, projectId };
  } catch {
    return null;
  }
}

export async function sentryCapture(
  err: unknown,
  context: Record<string, unknown> = {}
): Promise<void> {
  if (!SENTRY_DSN) return;
  const parsed = parseDsn(SENTRY_DSN);
  if (!parsed) return;

  const error = err instanceof Error ? err : new Error(String(err));
  const event = {
    event_id:   crypto.randomUUID().replace(/-/g, ""),
    timestamp:  new Date().toISOString(),
    platform:   "javascript",
    level:      "error",
    environment: Deno.env.get("ENVIRONMENT") ?? "production",
    exception: {
      values: [{
        type:       error.name,
        value:      error.message,
        stacktrace: error.stack
          ? { frames: error.stack.split("\n").slice(1).map((l) => ({ filename: l.trim() })) }
          : undefined,
      }],
    },
    extra: context,
  };

  try {
    await fetch(parsed.url, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7,sentry_client=motiff-edge/1.0,sentry_key=${parsed.key}`,
      },
      body: JSON.stringify(event),
    });
  } catch { /* never let observability crash the function */ }
}

// ── PostHog ───────────────────────────────────────────────────────────────────

export function posthogCapture(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {}
): void {
  if (!POSTHOG_KEY) return;
  // fire-and-forget — don't await so the main flow isn't slowed
  fetch(`${POSTHOG_HOST}/capture/`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key:     POSTHOG_KEY,
      event,
      distinct_id: distinctId,
      properties:  { ...properties, $lib: "motiff-edge" },
      timestamp:   new Date().toISOString(),
    }),
  }).catch(() => { /* swallow */ });
}
