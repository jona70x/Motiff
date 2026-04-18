import { z } from "zod";

export const focusOutcomeSchema = z.enum(["completed", "cancelled", "paused_ended"]);

export const focusSessionSchema = z.object({
  id:            z.string().uuid(),
  user_id:       z.string().uuid(),
  assignment_id: z.string().uuid().nullable(),
  started_at:    z.string().datetime(),
  ended_at:      z.string().datetime(),
  duration_s:    z.number().int().min(0),
  outcome:       focusOutcomeSchema,
  created_at:    z.string().datetime(),
});

export const focusSessionInsertSchema = focusSessionSchema.omit({
  id:         true,
  user_id:    true,
  created_at: true,
});

export type FocusOutcome = z.infer<typeof focusOutcomeSchema>;
export type FocusSession = z.infer<typeof focusSessionSchema>;
export type FocusSessionInsert = z.infer<typeof focusSessionInsertSchema>;
