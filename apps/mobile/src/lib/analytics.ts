import PostHog from "posthog-react-native";

const client = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "", {
  host: "https://us.i.posthog.com",
});

export const analytics = {
  identify(userId: string) {
    client.identify(userId);
  },

  // ── Upload funnel ──────────────────────────────────────────────────────────
  uploadStarted(props: { courseId: string; bytes: number }) {
    client.capture("upload_started", props);
  },
  uploadSucceeded(props: { courseId: string; bytes: number }) {
    client.capture("upload_succeeded", props);
  },
  uploadFailed(props: { courseId: string; error: string }) {
    client.capture("upload_failed", props);
  },

  // ── Extraction funnel ──────────────────────────────────────────────────────
  extractionTriggered(props: { uploadId: string; courseId: string }) {
    client.capture("extraction_triggered", props);
  },
  extractionSucceeded(props: { uploadId: string; candidateCount: number; partial: boolean }) {
    client.capture("extraction_succeeded", props);
  },
  extractionFailed(props: { uploadId: string; reason: string }) {
    client.capture("extraction_failed", props);
  },

  // ── Candidate review ───────────────────────────────────────────────────────
  candidateConfirmed(props: { uploadId: string; kind: string | null; wasEdited: boolean }) {
    client.capture("candidate_confirmed", props);
  },
  candidateRejected(props: { uploadId: string }) {
    client.capture("candidate_rejected", props);
  },
  bulkConfirmed(props: { uploadId: string; count: number }) {
    client.capture("candidate_bulk_confirmed", props);
  },

  // ── Focus funnel ───────────────────────────────────────────────────────────
  focusStarted(props: { assignmentId: string | null }) {
    client.capture("focus_started", props);
  },
  focusCompleted(props: { assignmentId: string | null; durationS: number }) {
    client.capture("focus_completed", props);
  },
  focusCancelled(props: { assignmentId: string | null; durationS: number }) {
    client.capture("focus_cancelled", props);
  },

  // ── Progress ───────────────────────────────────────────────────────────────
  progressScreenViewed() {
    client.capture("progress_screen_viewed", {});
  },

  // ── Plan ───────────────────────────────────────────────────────────────────
  planScreenViewed(props: { blockCount: number; budgetMinutes: number }) {
    client.capture("plan_screen_viewed", props);
  },
  planRegenerated(props: { blockCount: number; budgetMinutes: number }) {
    client.capture("plan_regenerated", props);
  },
};
