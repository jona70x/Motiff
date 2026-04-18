import { z } from "zod";

export const confidenceBandSchema = z.enum(["low", "medium", "high"]);
export type ConfidenceBand = z.infer<typeof confidenceBandSchema>;

/** Threshold rules matching the DB constraint */
export function confidenceToBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

/** Raw shape returned by the model tool call */
export const modelCandidateSchema = z.object({
  title: z.string().min(1).max(500),
  due_at: z.string().datetime({ offset: true }).nullable().optional(),
  kind: z.string().max(100).nullable().optional(),
  confidence: z.number().min(0).max(1),
  source_anchor: z.string().max(300).nullable().optional(),
});

export type ModelCandidate = z.infer<typeof modelCandidateSchema>;

export const modelCandidateArraySchema = z.array(modelCandidateSchema).max(200);

/** Full DB row shape */
export const candidateStatusSchema = z.enum(["pending", "confirmed", "edited", "rejected"]);

export const syllabusCandidateSchema = z.object({
  id: z.string().uuid(),
  upload_id: z.string().uuid(),
  user_id: z.string().uuid(),
  course_id: z.string().uuid(),
  title: z.string(),
  due_at: z.string().datetime({ offset: true }).nullable().optional(),
  kind: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  confidence_band: confidenceBandSchema,
  source_anchor: z.string().nullable().optional(),
  status: candidateStatusSchema,
  assignment_id: z.string().uuid().nullable().optional(),
  created_at: z.string().datetime(),
});

export type SyllabusCandidate = z.infer<typeof syllabusCandidateSchema>;
export type CandidateStatus = z.infer<typeof candidateStatusSchema>;

export const HIGH_CONFIDENCE_THRESHOLD = 0.8;
