/**
 * Edge Function: delete-course
 *
 * Performs a full, reliable course deletion:
 *   1. Authenticates the caller via JWT.
 *   2. Verifies the course belongs to that user (ownership check via user-scoped query).
 *   3. Lists all Supabase Storage objects under syllabi/{userId}/{courseId}/.
 *   4. Removes those storage objects using the service-role client.
 *   5. Deletes the course row; FK ON DELETE CASCADE handles all child rows
 *      (assignments, syllabus_uploads, syllabus_candidates, focus_sessions, plan_blocks).
 *
 * The client cannot reliably do steps 3–4 because a mid-delete network drop
 * would leave orphaned storage objects. Doing it server-side is atomic from
 * the user's perspective (DR-016).
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

// ── Types ──────────────────────────────────────────────────────────────────────

type DeleteResponse =
  | { ok: true; filesRemoved: number }
  | { ok: false; reason: "unauthorized" | "not_found" | "forbidden" | "error"; message?: string };

// ── Helpers ────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Handler ────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth ────────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json<DeleteResponse>({ ok: false, reason: "unauthorized", message: "Missing Authorization header" }, 401);
    }

    // Service-role client: used for storage operations and the final delete.
    // These bypass RLS intentionally — ownership is validated via the user client first.
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // User-scoped client: used only for auth verification and ownership check.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return json<DeleteResponse>({ ok: false, reason: "unauthorized", message: "Unauthorized" }, 401);
    }
    const userId = user.id;

    // ── Parse body ──────────────────────────────────────────────────────────────
    const { course_id } = await req.json() as { course_id?: string };
    if (!course_id) {
      return json<DeleteResponse>({ ok: false, reason: "error", message: "course_id is required" }, 400);
    }

    // ── Ownership check ─────────────────────────────────────────────────────────
    // Use the user-scoped client so RLS ensures the user can only see their own courses.
    const { data: course, error: courseError } = await userClient
      .from("courses")
      .select("id")
      .eq("id", course_id)
      .single();

    if (courseError?.code === "PGRST116" || !course) {
      return json<DeleteResponse>({ ok: false, reason: "not_found", message: "Course not found" }, 404);
    }
    if (courseError) {
      return json<DeleteResponse>({ ok: false, reason: "error", message: courseError.message }, 500);
    }

    // ── Storage cleanup ─────────────────────────────────────────────────────────
    // Files are stored at syllabi/{userId}/{courseId}/{timestamp}.ext
    const folderPrefix = `${userId}/${course_id}/`;

    const { data: fileList, error: listError } = await serviceClient
      .storage
      .from("syllabi")
      .list(`${userId}/${course_id}`, { limit: 1000 });

    if (listError) {
      // Non-fatal: log and continue. Storage objects may simply not exist
      // (e.g. course was created but no syllabus ever uploaded).
      console.error("Storage list error:", listError.message);
    }

    let filesRemoved = 0;
    if (fileList && fileList.length > 0) {
      const paths = fileList.map((f) => `${folderPrefix}${f.name}`);

      const { error: removeError } = await serviceClient
        .storage
        .from("syllabi")
        .remove(paths);

      if (removeError) {
        // Abort before deleting the DB row so the caller can retry.
        return json<DeleteResponse>(
          { ok: false, reason: "error", message: `Storage cleanup failed: ${removeError.message}` },
          500
        );
      }
      filesRemoved = paths.length;
    }

    // ── Delete course row ───────────────────────────────────────────────────────
    // Service-role client bypasses RLS; ownership was already verified above.
    // ON DELETE CASCADE handles: assignments, syllabus_uploads, syllabus_candidates,
    // focus_sessions, plan_blocks.
    const { error: deleteError } = await serviceClient
      .from("courses")
      .delete()
      .eq("id", course_id)
      .eq("user_id", userId); // belt-and-suspenders: still filter by user_id

    if (deleteError) {
      return json<DeleteResponse>(
        { ok: false, reason: "error", message: deleteError.message },
        500
      );
    }

    return json<DeleteResponse>({ ok: true, filesRemoved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("delete-course error:", message);
    return json<DeleteResponse>({ ok: false, reason: "error", message }, 500);
  }
});
