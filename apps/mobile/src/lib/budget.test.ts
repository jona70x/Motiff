import {
  parseBudgetInput,
  MAX_DAILY_BUDGET_MINUTES,
} from "../../../../packages/domain/plan/budget";

// ── parseBudgetInput ─────────────────────────────────────────────────────────

describe("parseBudgetInput", () => {
  // ── Rule 1: blank input clears the custom budget ─────────────────────────

  it("returns value: null for an empty string", () => {
    const result = parseBudgetInput("");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeNull();
  });

  it("returns value: null for a whitespace-only string", () => {
    const result = parseBudgetInput("   ");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeNull();
  });

  // ── Rule 2: digits-only guard ─────────────────────────────────────────────

  it("rejects a float string", () => {
    const result = parseBudgetInput("1.5");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/whole number/i);
  });

  it("rejects a string with letters", () => {
    const result = parseBudgetInput("abc");
    expect(result.ok).toBe(false);
  });

  it("rejects a string with a leading minus sign", () => {
    const result = parseBudgetInput("-30");
    expect(result.ok).toBe(false);
  });

  it("rejects a string with a plus sign", () => {
    const result = parseBudgetInput("+60");
    expect(result.ok).toBe(false);
  });

  it("rejects a string with mixed digits and letters", () => {
    const result = parseBudgetInput("120abc");
    expect(result.ok).toBe(false);
  });

  // ── Rule 3: must be positive ──────────────────────────────────────────────

  it("rejects zero", () => {
    const result = parseBudgetInput("0");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/greater than 0/i);
  });

  // ── Rule 4: must not exceed 24 hours ─────────────────────────────────────

  it("rejects a value above MAX_DAILY_BUDGET_MINUTES", () => {
    const result = parseBudgetInput(String(MAX_DAILY_BUDGET_MINUTES + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/24 hours/i);
  });

  it("rejects 9999 with the 24-hour error", () => {
    const result = parseBudgetInput("9999");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/24 hours/i);
  });

  // ── Rule 5: valid inputs ──────────────────────────────────────────────────

  it("accepts 1 (minimum valid value)", () => {
    const result = parseBudgetInput("1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(1);
  });

  it("accepts 60 (typical one-hour budget)", () => {
    const result = parseBudgetInput("60");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(60);
  });

  it("accepts 120 (default app budget)", () => {
    const result = parseBudgetInput("120");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(120);
  });

  it("accepts MAX_DAILY_BUDGET_MINUTES exactly", () => {
    const result = parseBudgetInput(String(MAX_DAILY_BUDGET_MINUTES));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(MAX_DAILY_BUDGET_MINUTES);
  });

  it("trims surrounding whitespace before parsing", () => {
    const result = parseBudgetInput("  90  ");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(90);
  });

  it("preserves the parsed integer type", () => {
    const result = parseBudgetInput("45");
    expect(result.ok).toBe(true);
    if (result.ok) expect(typeof result.value).toBe("number");
  });
});
