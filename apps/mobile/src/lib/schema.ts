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

export type Course = z.infer<typeof courseSchema>;
export type CourseInsert = z.infer<typeof courseInsertSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type AssignmentInsert = z.infer<typeof assignmentInsertSchema>;
export type SyllabusUploadStatus = z.infer<typeof syllabusUploadStatusSchema>;
export type SyllabusUpload = z.infer<typeof syllabusUploadSchema>;
