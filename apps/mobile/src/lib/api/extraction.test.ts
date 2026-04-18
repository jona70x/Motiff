// Tests for the candidate schema parser and confidence band logic.
// The Edge Function budget/Claude calls are tested via the domain package.

import { modelCandidateArraySchema, confidenceToBand, HIGH_CONFIDENCE_THRESHOLD } from "../schema";

describe("confidenceToBand", () => {
  it("returns high for confidence >= 0.8", () => {
    expect(confidenceToBand(0.8)).toBe("high");
    expect(confidenceToBand(0.9)).toBe("high");
    expect(confidenceToBand(1.0)).toBe("high");
  });

  it("returns medium for confidence 0.5 to < 0.8", () => {
    expect(confidenceToBand(0.5)).toBe("medium");
    expect(confidenceToBand(0.7)).toBe("medium");
    expect(confidenceToBand(0.79)).toBe("medium");
  });

  it("returns low for confidence < 0.5", () => {
    expect(confidenceToBand(0.0)).toBe("low");
    expect(confidenceToBand(0.3)).toBe("low");
    expect(confidenceToBand(0.49)).toBe("low");
  });
});

describe("HIGH_CONFIDENCE_THRESHOLD", () => {
  it("is 0.8", () => {
    expect(HIGH_CONFIDENCE_THRESHOLD).toBe(0.8);
  });
});

describe("modelCandidateArraySchema", () => {
  const validItem = {
    title: "Midterm Exam",
    due_at: "2025-10-15T23:59:00-07:00",
    kind: "exam",
    confidence: 0.95,
    source_anchor: "Midterm Exam – October 15",
  };

  it("accepts a valid candidate array", () => {
    expect(() => modelCandidateArraySchema.parse([validItem])).not.toThrow();
  });

  it("accepts an empty array", () => {
    expect(() => modelCandidateArraySchema.parse([])).not.toThrow();
  });

  it("rejects confidence > 1", () => {
    expect(() =>
      modelCandidateArraySchema.parse([{ ...validItem, confidence: 1.1 }])
    ).toThrow();
  });

  it("rejects confidence < 0", () => {
    expect(() =>
      modelCandidateArraySchema.parse([{ ...validItem, confidence: -0.1 }])
    ).toThrow();
  });

  it("rejects empty title", () => {
    expect(() =>
      modelCandidateArraySchema.parse([{ ...validItem, title: "" }])
    ).toThrow();
  });

  it("rejects title over 500 chars", () => {
    expect(() =>
      modelCandidateArraySchema.parse([{ ...validItem, title: "x".repeat(501) }])
    ).toThrow();
  });

  it("accepts null due_at", () => {
    expect(() =>
      modelCandidateArraySchema.parse([{ ...validItem, due_at: null }])
    ).not.toThrow();
  });

  it("accepts missing optional fields", () => {
    expect(() =>
      modelCandidateArraySchema.parse([{ title: "HW 1", confidence: 0.7 }])
    ).not.toThrow();
  });

  it("rejects more than 200 items", () => {
    const tooMany = Array.from({ length: 201 }, (_, i) => ({
      title: `Assignment ${i}`,
      confidence: 0.8,
    }));
    expect(() => modelCandidateArraySchema.parse(tooMany)).toThrow();
  });
});
