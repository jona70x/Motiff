import { syllabusUploadSchema, syllabusUploadStatusSchema } from "./schema";

describe("syllabusUploadStatusSchema", () => {
  it("accepts valid statuses", () => {
    for (const s of ["pending", "extracting", "extracted", "failed", "unsupported"]) {
      expect(syllabusUploadStatusSchema.parse(s)).toBe(s);
    }
  });

  it("rejects unknown status", () => {
    expect(() => syllabusUploadStatusSchema.parse("unknown")).toThrow();
  });
});

describe("syllabusUploadSchema", () => {
  const base = {
    id: "00000000-0000-0000-0000-000000000001",
    user_id: "00000000-0000-0000-0000-000000000002",
    course_id: "00000000-0000-0000-0000-000000000003",
    storage_path: "user-id/course-id/1234.pdf",
    mime_type: "application/pdf",
    byte_size: 1024,
    status: "pending" as const,
    created_at: "2025-06-15T10:00:00.000Z",
  };

  it("accepts a valid upload row", () => {
    expect(() => syllabusUploadSchema.parse(base)).not.toThrow();
  });

  it("rejects zero byte_size", () => {
    expect(() => syllabusUploadSchema.parse({ ...base, byte_size: 0 })).toThrow();
  });

  it("rejects negative byte_size", () => {
    expect(() => syllabusUploadSchema.parse({ ...base, byte_size: -1 })).toThrow();
  });

  it("rejects empty storage_path", () => {
    expect(() => syllabusUploadSchema.parse({ ...base, storage_path: "" })).toThrow();
  });

  it("rejects invalid status", () => {
    expect(() => syllabusUploadSchema.parse({ ...base, status: "uploading" })).toThrow();
  });

  it("accepts null raw_text and error_msg", () => {
    expect(() =>
      syllabusUploadSchema.parse({ ...base, raw_text: null, error_msg: null })
    ).not.toThrow();
  });
});
