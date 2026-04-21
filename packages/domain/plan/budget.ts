/**
 * @module plan/budget
 * Pure validation helpers for the user-configurable daily study budget.
 * No I/O — accepts raw text input and returns a typed result.
 *
 * Keeping validation here (rather than inline in the screen) makes
 * it trivially unit-testable and reusable if a second entry point is
 * ever added (e.g. an onboarding wizard or a widget settings panel).
 */

/** Maximum sensible daily budget — 24 hours expressed in minutes. */
export const MAX_DAILY_BUDGET_MINUTES = 1440;

/**
 * Successful parse result.
 * `value` is the parsed integer, or `null` when the input was blank
 * (meaning "clear the custom budget and revert to the app default").
 */
export type BudgetParseOk = {
  ok: true;
  /** Parsed budget in minutes, or null to revert to the app default. */
  value: number | null;
};

/**
 * Failed parse result containing a human-readable validation message
 * suitable for display directly in the UI.
 */
export type BudgetParseError = {
  ok: false;
  /** Reason the input was rejected. */
  error: string;
};

/** Discriminated union returned by {@link parseBudgetInput}. */
export type BudgetParseResult = BudgetParseOk | BudgetParseError;

/**
 * Validates and parses a raw text string from the daily-budget input field.
 *
 * Rules (in evaluation order):
 * 1. Blank / whitespace-only → `{ ok: true, value: null }` (clear custom budget).
 * 2. Contains non-digit characters → error (prevents float strings like "1.5").
 * 3. Parses to zero or negative → error.
 * 4. Exceeds {@link MAX_DAILY_BUDGET_MINUTES} → error.
 * 5. Otherwise → `{ ok: true, value: parsedInteger }`.
 *
 * @param text - Raw string from the TextInput (may be empty or contain whitespace).
 * @returns A {@link BudgetParseResult} discriminated union.
 *
 * @example
 * parseBudgetInput("")      // { ok: true, value: null }
 * parseBudgetInput("90")    // { ok: true, value: 90 }
 * parseBudgetInput("0")     // { ok: false, error: "..." }
 * parseBudgetInput("1.5")   // { ok: false, error: "..." }
 * parseBudgetInput("9999")  // { ok: false, error: "..." }
 */
export function parseBudgetInput(text: string): BudgetParseResult {
  const trimmed = text.trim();

  // Rule 1: blank = clear custom budget
  if (trimmed === "") {
    return { ok: true, value: null };
  }

  // Rule 2: must be digits only (rejects floats, negatives entered as "-30", etc.)
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, error: "Please enter a whole number greater than 0." };
  }

  const parsed = parseInt(trimmed, 10);

  // Rule 3: must be positive
  if (parsed <= 0) {
    return { ok: false, error: "Please enter a whole number greater than 0." };
  }

  // Rule 4: must not exceed one full day
  if (parsed > MAX_DAILY_BUDGET_MINUTES) {
    return {
      ok: false,
      error: `Daily budget can't exceed ${MAX_DAILY_BUDGET_MINUTES} minutes (24 hours).`,
    };
  }

  // Rule 5: valid
  return { ok: true, value: parsed };
}
