import { z } from "zod";

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

export type SyllabusUploadStatus = z.infer<typeof syllabusUploadStatusSchema>;
export type SyllabusUpload = z.infer<typeof syllabusUploadSchema>;
