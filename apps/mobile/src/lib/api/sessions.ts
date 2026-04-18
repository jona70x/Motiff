import { supabase } from "../supabase";
import type { FocusOutcome } from "../../../../../packages/domain/focus/session";

export type SessionInsertPayload = {
  assignment_id: string | null;
  started_at: string;
  ended_at: string;
  duration_s: number;
  outcome: FocusOutcome;
};

export async function createFocusSession(payload: SessionInsertPayload): Promise<void> {
  const { error } = await supabase.from("focus_sessions").insert(payload);
  if (error) throw new Error(error.message);
}
