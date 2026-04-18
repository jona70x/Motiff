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
