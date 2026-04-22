/**
 * delete-account — permanently deletes a Supabase user and all their data.
 *
 * Deletion order (safe for CASCADE constraints):
 *   1. Storage objects in the `syllabi` bucket under the user's path prefix.
 *   2. auth.users row — this triggers ON DELETE CASCADE through:
 *        auth.users → profiles → courses → assignments
 *                                        → syllabus_uploads
 *                                        → syllabus_candidates
 *                                        → focus_sessions
 *                                        → plan_blocks
 *                                        → llm_usage
 *
 * Storage is removed before the DB row to prevent orphaned files. If storage
 * removal fails the function aborts before touching the DB, allowing safe retry.
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
};

type DeleteResponse =
  | { ok: true }
  | { ok: false; message: string };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
    // All syllabus files for a user are stored under `<userId>/` in the syllabi bucket.
    const storageObjects = await listAllStorageObjects(serviceClient, "syllabi", `${userId}/`);

    if (storageObjects.length > 0) {
      const paths = storageObjects.map((o) => o.name);
      const { error: removeErr } = await serviceClient
        .storage
        .from("syllabi")
        .remove(paths);

      if (removeErr) {
        // Abort before touching the DB so the caller can retry safely.
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

type StorageObject = { name: string };

/**
 * Lists all objects under `prefix` in `bucket`, paginating through the
 * Supabase 1000-item-per-page limit until the full list is collected.
 */
async function listAllStorageObjects(
  client: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string
): Promise<StorageObject[]> {
  const PAGE_SIZE = 1000;
  const all: StorageObject[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await client.storage
      .from(bucket)
      .list(prefix, { limit: PAGE_SIZE, offset });

    if (error) {
      console.error("delete-account storage list error:", error.message);
      break;
    }

    const page = (data ?? []) as StorageObject[];
    // Prefix the names with the folder path so remove() gets full object paths.
    all.push(...page.map((o) => ({ name: `${prefix}${o.name}` })));

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}
