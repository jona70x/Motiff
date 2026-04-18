import { z } from "zod";

export const courseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1, "Course title is required").max(255),
  term: z.string().optional().nullable(),
  created_at: z.string().datetime(),
});

export const courseInsertSchema = courseSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
});

export const assignmentSchema = z.object({
  id: z.string().uuid(),
  course_id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1, "Assignment title is required").max(255),
  due_at: z.string().datetime().optional().nullable(),
  kind: z.string().optional().nullable(),
  est_minutes: z.number().int().positive().optional().nullable(),
  created_at: z.string().datetime(),
});

export const assignmentInsertSchema = assignmentSchema.omit({
  id: true,
  course_id: true,
  user_id: true,
  created_at: true,
});

export const syllabusUploadStatusSchema = z.enum([
  "pending",
  "extracting",
  "extracted",
  "failed",
  "unsupported",
]);

export const syllabusUploadSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  course_id: z.string().uuid(),
  storage_path: z.string().min(1),
  mime_type: z.string(),
  byte_size: z.number().int().positive(),
  status: syllabusUploadStatusSchema,
  raw_text: z.string().nullable().optional(),
  error_msg: z.string().nullable().optional(),
  created_at: z.string().datetime(),
});

export const confidenceBandSchema = z.enum(["low", "medium", "high"]);
export const candidateStatusSchema = z.enum(["pending", "confirmed", "edited", "rejected"]);

export const modelCandidateSchema = z.object({
  title: z.string().min(1).max(500),
  due_at: z.string().datetime({ offset: true }).nullable().optional(),
  kind: z.string().max(100).nullable().optional(),
  confidence: z.number().min(0).max(1),
  source_anchor: z.string().max(300).nullable().optional(),
});
export const modelCandidateArraySchema = z.array(modelCandidateSchema).max(200);

export const HIGH_CONFIDENCE_THRESHOLD = 0.8;

export function confidenceToBand(confidence: number): "low" | "medium" | "high" {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

export const syllabusCandidateSchema = z.object({
  id: z.string().uuid(),
  upload_id: z.string().uuid(),
  user_id: z.string().uuid(),
  course_id: z.string().uuid(),
  title: z.string(),
  due_at: z.string().nullable().optional(),
  kind: z.string().nullable().optional(),
  confidence: z.number(),
  confidence_band: confidenceBandSchema,
  source_anchor: z.string().nullable().optional(),
  status: candidateStatusSchema,
  assignment_id: z.string().uuid().nullable().optional(),
  created_at: z.string().datetime(),
});

export type Course = z.infer<typeof courseSchema>;
export type CourseInsert = z.infer<typeof courseInsertSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type AssignmentInsert = z.infer<typeof assignmentInsertSchema>;
export type SyllabusUploadStatus = z.infer<typeof syllabusUploadStatusSchema>;
export type SyllabusUpload = z.infer<typeof syllabusUploadSchema>;
export type ConfidenceBand = z.infer<typeof confidenceBandSchema>;
export type CandidateStatus = z.infer<typeof candidateStatusSchema>;
export type SyllabusCandidate = z.infer<typeof syllabusCandidateSchema>;
