import { supabase } from "../supabase";
import type { SyllabusCandidate } from "../schema";

export type ExtractionResponse =
  | { ok: true;  count: number; partial: boolean }
  | { ok: false; reason: "flag_off" | "budget_exceeded" | "unsupported" | "already_processed" | "error"; message?: string };

export async function triggerExtraction(uploadId: string): Promise<ExtractionResponse> {
  const { data, error } = await supabase.functions.invoke<ExtractionResponse>(
    "extract-syllabus",
    { body: { upload_id: uploadId } }
  );

  if (error) {
    return { ok: false, reason: "error", message: error.message };
  }

  return data ?? { ok: false, reason: "error", message: "Empty response from function" };
}

export async function getCandidatesByUpload(uploadId: string): Promise<SyllabusCandidate[]> {
  const { data, error } = await supabase
    .from("syllabus_candidates")
    .select("*")
    .eq("upload_id", uploadId)
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data as SyllabusCandidate[]) ?? [];
}

export interface CandidateEdits {
  title: string;
  due_at: string | null;
  kind: string | null;
}

export async function confirmCandidate(
  candidate: SyllabusCandidate,
  edits?: CandidateEdits
): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const title  = edits?.title  ?? candidate.title;
  const due_at = edits !== undefined ? edits.due_at : candidate.due_at ?? null;
  const kind   = edits !== undefined ? edits.kind   : candidate.kind   ?? null;

  const { data: assignment, error: insertErr } = await supabase
    .from("assignments")
    .insert({ title, due_at, kind, course_id: candidate.course_id, user_id: userId })
    .select("id")
    .single();

  if (insertErr) throw new Error(insertErr.message);

  const status = edits ? "edited" : "confirmed";
  const { error: updateErr } = await supabase
    .from("syllabus_candidates")
    .update({ status, assignment_id: assignment.id })
    .eq("id", candidate.id);

  if (updateErr) throw new Error(updateErr.message);
}

export async function rejectCandidate(candidateId: string): Promise<void> {
  const { error } = await supabase
    .from("syllabus_candidates")
    .update({ status: "rejected" })
    .eq("id", candidateId);

  if (error) throw new Error(error.message);
}

export async function bulkConfirmHighConfidence(
  candidates: SyllabusCandidate[]
): Promise<number> {
  const eligible = candidates.filter(
    (c) => c.status === "pending" && c.confidence_band === "high"
  );
  await Promise.all(eligible.map((c) => confirmCandidate(c)));
  return eligible.length;
}
