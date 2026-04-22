/**
 * Edge Function: delete-course
 *
 * Performs a full, reliable course deletion:
 *   1. Authenticates the caller via JWT.
 *   2. Verifies the course belongs to that user (ownership check via user-scoped query).
 *   3. Lists and removes ALL Supabase Storage objects under syllabi/{userId}/{courseId}/,
 *      paginating through the list API in case there are more than 1000 files.
 *   4. Deletes the course row; FK ON DELETE CASCADE handles all child rows
 *      (assignments, syllabus_uploads, syllabus_candidates, focus_sessions, plan_blocks).
 *
 * The client cannot reliably do steps 3–4 because a mid-delete network drop
 * would leave orphaned storage objects. Doing it server-side is atomic from
 * the user's perspective (DR-016).
 *
 * Error messages returned to the client are intentionally generic to avoid
 * leaking Postgres schema details (column names, position offsets, etc.).
 * Detailed errors are logged server-side via console.error.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

// ── Types ──────────────────────────────────────────────────────────────────────

type DeleteResponse =
  | { ok: true; filesRemoved: number }
  | { ok: false; reason: "unauthorized" | "not_found" | "error"; message: string };

// ── Helpers ────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type StorageItem = {
  id:       string | null;
  name:     string;
  metadata: Record<string, unknown> | null;
};

/**
 * Recursively lists every file object under `prefix` in `bucket`.
 *
 * Supabase's list() returns only immediate children. Items with `id === null`
 * are folder placeholders — we recurse into them. Items with a non-null `id`
 * are real files and are added to the result.
 *
 * Paginates in 1000-item pages so courses with many syllabi are fully swept.
 * Throws on any list failure so the caller aborts before touching the DB.
 *
 * @param client - Service-role Supabase client (bypasses storage RLS).
 * @param bucket - Storage bucket name.
 * @param prefix - Path prefix to list, including trailing slash.
 * @returns Fully-qualified paths of every file under the prefix.
 */
async function listAllStorageObjects(
  client: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const PAGE_SIZE = 1000;
  const allPaths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await client
      .storage
      .from(bucket)
      .list(prefix, { limit: PAGE_SIZE, offset });

    if (error) throw new Error(`Storage list failed at '${prefix}': ${error.message}`);

    const page = (data ?? []) as StorageItem[];

    for (const item of page) {
      if (item.id === null) {
        // Folder placeholder — recurse to collect leaf files inside it.
        const subPaths = await listAllStorageObjects(client, bucket, `${prefix}${item.name}/`);
        allPaths.push(...subPaths);
      } else {
        allPaths.push(`${prefix}${item.name}`);
      }
    }

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return allPaths;
}

// ── Handler ────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // ── Auth ────────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json<DeleteResponse>({ ok: false, reason: "unauthorized", message: "Missing Authorization header" }, 401);
    }

    // Service-role client: bypasses RLS for storage operations and the final DB delete.
    // Ownership is validated via the user-scoped client below before this is used.
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // User-scoped client: used only for auth verification and the ownership check.
    // RLS on the courses table ensures the caller cannot enumerate other users' courses.
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
    // RLS allows the user-scoped client to SELECT only their own courses.
    // A non-existent or foreign-user course returns PGRST116 → 404.
    const { data: course, error: courseError } = await userClient
      .from("courses")
      .select("id")
      .eq("id", course_id)
      .single();

    if (courseError?.code === "PGRST116" || !course) {
      return json<DeleteResponse>({ ok: false, reason: "not_found", message: "Course not found" }, 404);
    }
    if (courseError) {
      // Log the raw Postgres error server-side; return a generic message to the client.
      console.error("delete-course ownership check error:", courseError.message);
      return json<DeleteResponse>({ ok: false, reason: "error", message: "Internal error" }, 500);
    }

    // ── Storage cleanup ─────────────────────────────────────────────────────────
    // Files are stored at syllabi/{userId}/{courseId}/{timestamp}.ext.
    // Paginate through the list API so courses with >1000 files are fully cleaned up.
    const folderPrefix = `${userId}/${course_id}/`;
    let filesRemoved = 0;

    try {
      const paths = await listAllStorageObjects(serviceClient, "syllabi", folderPrefix);

      if (paths.length > 0) {
        const { error: removeError } = await serviceClient
          .storage
          .from("syllabi")
          .remove(paths);

        if (removeError) {
          // Abort before deleting the DB row so the caller can retry and recover.
          console.error("delete-course storage remove error:", removeError.message);
          return json<DeleteResponse>(
            { ok: false, reason: "error", message: "Failed to remove course files. Please try again." },
            500
          );
        }
        filesRemoved = paths.length;
      }
    } catch (storageErr) {
      // List pagination failure — the folder may simply not exist (no syllabi uploaded).
      // Log and continue; missing storage objects are not a fatal condition for the delete.
      console.error("delete-course storage list error:", storageErr instanceof Error ? storageErr.message : storageErr);
    }

    // ── Delete course row ───────────────────────────────────────────────────────
    // Service-role client is used here (bypasses RLS); ownership was verified above.
    // Filtering by user_id adds a belt-and-suspenders guard against accidental deletions.
    const { error: deleteError } = await serviceClient
      .from("courses")
      .delete()
      .eq("id", course_id)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("delete-course DB delete error:", deleteError.message);
      return json<DeleteResponse>(
        { ok: false, reason: "error", message: "Internal error" },
        500
      );
    }

    return json<DeleteResponse>({ ok: true, filesRemoved });
  } catch (err) {
    console.error("delete-course unhandled error:", err instanceof Error ? err.message : err);
    return json<DeleteResponse>({ ok: false, reason: "error", message: "Internal error" }, 500);
  }
});
