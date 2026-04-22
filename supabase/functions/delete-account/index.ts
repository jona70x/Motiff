/**
 * delete-account — permanently deletes a Supabase user and all their data.
 *
 * Deletion order (safe for CASCADE constraints):
 *   1. Storage objects in the `syllabi` bucket under the user's path prefix.
 *      Files are stored at `<userId>/<courseId>/<filename>`, so the sweep
 *      recursively walks subdirectories to collect all leaf objects.
 *   2. auth.users row — this triggers ON DELETE CASCADE through:
 *        auth.users → profiles → courses → assignments
 *                                        → syllabus_uploads
 *                                        → syllabus_candidates
 *                                        → focus_sessions
 *                                        → plan_blocks
 *                                        → llm_usage
 *
 * Storage is removed before the DB row to prevent orphaned files. Any error
 * during the storage sweep causes the function to abort and return 500,
 * leaving the DB intact so the caller can retry safely.
 *
 * Deploy:
 *   npx supabase functions deploy delete-account --no-verify-jwt
 *
 * The --no-verify-jwt flag is required because this project uses ES256 JWTs,
 * which the Supabase Edge Runtime's built-in verifier does not support.
 * The function validates the caller itself via userClient.auth.getUser().
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type DeleteResponse =
  | { ok: true }
  | { ok: false; message: string };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only POST is accepted; reject everything else with 405 before touching auth.
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // ── Authenticate caller ─────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json<DeleteResponse>({ ok: false, message: "Missing Authorization header" }, 401);
    }

    // User-scoped client: subject to RLS — used only to verify identity.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return json<DeleteResponse>({ ok: false, message: "Unauthorized" }, 401);
    }
    const userId = user.id;

    // Service-role client: bypasses RLS for storage and admin operations.
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Remove storage objects ──────────────────────────────────────────────────
    // Files are stored at `<userId>/<courseId>/<filename>` — a two-level hierarchy.
    // listAllStorageObjects recurses into subdirectories to collect every leaf file.
    // If any list call fails it throws, aborting before the DB deletion.
    const storagePaths = await listAllStorageObjects(serviceClient, "syllabi", `${userId}/`);

    if (storagePaths.length > 0) {
      const { error: removeErr } = await serviceClient
        .storage
        .from("syllabi")
        .remove(storagePaths);

      if (removeErr) {
        console.error("delete-account storage remove error:", removeErr.message);
        return json<DeleteResponse>({ ok: false, message: "Internal error" }, 500);
      }
    }

    // ── Delete the auth user (cascades to all DB tables) ───────────────────────
    const { error: deleteErr } = await serviceClient.auth.admin.deleteUser(userId);
    if (deleteErr) {
      console.error("delete-account deleteUser error:", deleteErr.message);
      return json<DeleteResponse>({ ok: false, message: "Internal error" }, 500);
    }

    return json<DeleteResponse>({ ok: true });

  } catch (err) {
    console.error("delete-account unhandled error:", err);
    return json<DeleteResponse>({ ok: false, message: "Internal error" }, 500);
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

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
 * Throws on any list failure so the caller aborts before touching the DB,
 * avoiding partial cleanup that would leave orphaned storage files.
 *
 * @param client - Service-role Supabase client (bypasses storage RLS).
 * @param bucket - Storage bucket name.
 * @param prefix - Path prefix to list, including trailing slash (e.g. "userId/").
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
    const { data, error } = await client.storage
      .from(bucket)
      .list(prefix, { limit: PAGE_SIZE, offset });

    if (error) {
      // Throw so the outer handler returns 500 and the DB row is NOT deleted.
      // A transient failure here would otherwise leave orphaned storage objects.
      throw new Error(`Storage list failed at '${prefix}': ${error.message}`);
    }

    const page = (data ?? []) as StorageItem[];

    for (const item of page) {
      if (item.id === null) {
        // Folder placeholder — recurse to collect leaf files inside it.
        const subPaths = await listAllStorageObjects(
          client,
          bucket,
          `${prefix}${item.name}/`
        );
        allPaths.push(...subPaths);
      } else {
        // Real file — add its fully-qualified path.
        allPaths.push(`${prefix}${item.name}`);
      }
    }

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return allPaths;
}
