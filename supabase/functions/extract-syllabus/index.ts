import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkBudget, incrementUsage } from "../_shared/budget.ts";
import { extractCandidates } from "../_shared/claude.ts";
import { extractPdfText } from "../_shared/pdf.ts";
import { sentryCapture, posthogCapture } from "../_shared/observability.ts";

const MONTHLY_CAP_USD = Number(Deno.env.get("EXTRACTION_MONTHLY_CAP_USD") ?? "0.50");

type ExtractResponse =
  | { ok: true;  count: number; partial: boolean }
  | { ok: false; reason: "flag_off" | "budget_exceeded" | "unsupported" | "already_processed" | "error"; message?: string };

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let serviceClient: ReturnType<typeof createClient> | null = null;
  let uploadIdForCleanup: string | null = null;

  try {
    // ── Feature flag ────────────────────────────────────────────────────────
    if (Deno.env.get("SYLLABUS_EXTRACTION_ENABLED") !== "true") {
      return json<ExtractResponse>({ ok: false, reason: "flag_off" }, 200);
    }

    // ── Auth ─────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json<ExtractResponse>({ ok: false, reason: "error", message: "Missing Authorization header" }, 401);
    }

    serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return json<ExtractResponse>({ ok: false, reason: "error", message: "Unauthorized" }, 401);
    }
    const userId = user.id;

    // ── Parse body ────────────────────────────────────────────────────────────
    const { upload_id } = await req.json() as { upload_id?: string };
    if (!upload_id) {
      return json<ExtractResponse>({ ok: false, reason: "error", message: "upload_id is required" }, 400);
    }
    uploadIdForCleanup = upload_id;

    // ── Load upload row (must belong to caller) ───────────────────────────────
    const { data: upload, error: uploadErr } = await serviceClient
      .from("syllabus_uploads")
      .select("id, user_id, course_id, storage_path, status")
      .eq("id", upload_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (uploadErr) throw uploadErr;
    if (!upload) {
      return json<ExtractResponse>({ ok: false, reason: "error", message: "Upload not found" }, 404);
    }

    // ── Idempotency ───────────────────────────────────────────────────────────
    if (upload.status === "extracting" || upload.status === "extracted") {
      return json<ExtractResponse>({ ok: false, reason: "already_processed" }, 200);
    }

    // ── Budget check ──────────────────────────────────────────────────────────
    const budget = await checkBudget(serviceClient, userId, MONTHLY_CAP_USD);
    if (!budget.allowed) {
      return json<ExtractResponse>({ ok: false, reason: "budget_exceeded" }, 200);
    }

    // ── Mark as extracting ────────────────────────────────────────────────────
    await serviceClient
      .from("syllabus_uploads")
      .update({ status: "extracting" })
      .eq("id", upload_id);

    // ── Fetch PDF from storage ────────────────────────────────────────────────
    const { data: fileData, error: downloadErr } = await serviceClient
      .storage
      .from("syllabi")
      .download(upload.storage_path);

    if (downloadErr || !fileData) {
      await setUploadFailed(serviceClient, upload_id, "Failed to download file");
      return json<ExtractResponse>({ ok: false, reason: "error", message: "Failed to download file" }, 500);
    }

    const pdfBytes = new Uint8Array(await fileData.arrayBuffer());

    // ── Extract text from PDF ─────────────────────────────────────────────────
    const { text, isTextBased } = extractPdfText(pdfBytes);

    if (!isTextBased) {
      await serviceClient
        .from("syllabus_uploads")
        .update({
          status: "unsupported",
          error_msg: "This PDF appears to be image-only. Text extraction is not supported yet.",
        })
        .eq("id", upload_id);
      return json<ExtractResponse>({ ok: false, reason: "unsupported" }, 200);
    }

    // Persist raw text (retained 30 days per DR-011 — purge is a separate job)
    await serviceClient
      .from("syllabus_uploads")
      .update({ raw_text: text })
      .eq("id", upload_id);

    // ── Call Claude ───────────────────────────────────────────────────────────
    posthogCapture(userId, "extraction_started_server", { upload_id, course_id: upload.course_id });
    let extractionResult;
    try {
      extractionResult = await extractCandidates(text);
    } catch (err) {
      await sentryCapture(err, { upload_id, userId });
      posthogCapture(userId, "extraction_failed_server", { upload_id, reason: String(err) });
      await setUploadFailed(serviceClient, upload_id, String(err));
      return json<ExtractResponse>({ ok: false, reason: "error", message: String(err) }, 500);
    }

    const { candidates, tokensIn, tokensOut, usdEstimate, partial } = extractionResult;

    posthogCapture(userId, "extraction_completed_server", {
      upload_id,
      course_id:       upload.course_id,
      candidate_count: candidates.length,
      tokens_in:       tokensIn,
      tokens_out:      tokensOut,
      usd_estimate:    usdEstimate,
      partial,
    });

    // ── Increment usage ───────────────────────────────────────────────────────
    await incrementUsage(serviceClient, userId, { tokensIn, tokensOut, usdEstimate });

    // ── Insert candidates ─────────────────────────────────────────────────────
    if (candidates.length > 0) {
      const rows = candidates.map((c) => ({
        upload_id,
        user_id:         userId,
        course_id:       upload.course_id,
        title:           c.title,
        due_at:          c.due_at ?? null,
        kind:            c.kind ?? null,
        confidence:      c.confidence,
        confidence_band: confidenceToBand(c.confidence),
        source_anchor:   c.source_anchor ?? null,
        status:          "pending",
      }));

      const { error: insertErr } = await serviceClient
        .from("syllabus_candidates")
        .insert(rows);

      if (insertErr) {
        await setUploadFailed(serviceClient, upload_id, `Candidate insert failed: ${insertErr.message}`);
        return json<ExtractResponse>({ ok: false, reason: "error", message: insertErr.message }, 500);
      }
    }

    // ── Mark extracted ────────────────────────────────────────────────────────
    await serviceClient
      .from("syllabus_uploads")
      .update({ status: "extracted" })
      .eq("id", upload_id);

    return json<ExtractResponse>({ ok: true, count: candidates.length, partial });

  } catch (err) {
    console.error("extract-syllabus unhandled error:", err);
    // Always reset stuck "extracting" rows so the user can retry
    if (serviceClient && uploadIdForCleanup) {
      await serviceClient
        .from("syllabus_uploads")
        .update({ status: "failed", error_msg: err instanceof Error ? err.message : String(err) })
        .eq("id", uploadIdForCleanup)
        .eq("status", "extracting");
    }
    return json<ExtractResponse>(
      { ok: false, reason: "error", message: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function setUploadFailed(
  client: ReturnType<typeof createClient>,
  uploadId: string,
  message: string
): Promise<void> {
  await client
    .from("syllabus_uploads")
    .update({ status: "failed", error_msg: message })
    .eq("id", uploadId);
}

function confidenceToBand(confidence: number): "low" | "medium" | "high" {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}
