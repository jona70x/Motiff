import { computeStreak } from "./profile";

// Fixed reference date for all streak tests: 2026-04-22 (Wednesday)
const TODAY = "2026-04-22";
const YESTERDAY = "2026-04-21";
const TWO_DAYS_AGO = "2026-04-20";

describe("computeStreak", () => {
  it("returns 0 when the user has never had a session", () => {
    expect(computeStreak([], TODAY)).toBe(0);
  });

  it("returns 1 when the only session was today", () => {
    expect(computeStreak([TODAY], TODAY)).toBe(1);
  });

  it("returns 2 when there are sessions today and yesterday", () => {
    expect(computeStreak([TODAY, YESTERDAY], TODAY)).toBe(2);
  });

  it("returns 1 when the only session was yesterday (user hasn't studied yet today)", () => {
    expect(computeStreak([YESTERDAY], TODAY)).toBe(1);
  });

  it("returns 0 when the most recent session was 2 days ago (gap breaks streak)", () => {
    expect(computeStreak([TWO_DAYS_AGO], TODAY)).toBe(0);
  });

  it("returns 3 for a three-day consecutive run ending today", () => {
    expect(computeStreak([TODAY, YESTERDAY, TWO_DAYS_AGO], TODAY)).toBe(3);
  });

  it("stops at a gap even if older dates exist", () => {
    // today + yesterday but NOT two_days_ago, then three_days_ago — gap breaks at 2d ago
    const THREE_DAYS_AGO = "2026-04-19";
    expect(computeStreak([TODAY, YESTERDAY, THREE_DAYS_AGO], TODAY)).toBe(2);
  });

  it("handles unsorted input correctly", () => {
    // Order should not matter — streak is computed from a Set
    expect(computeStreak([YESTERDAY, TODAY], TODAY)).toBe(2);
  });

  it("ignores duplicate dates", () => {
    expect(computeStreak([TODAY, TODAY, YESTERDAY], TODAY)).toBe(2);
  });

  it("returns 0 when dates are all older than yesterday", () => {
    expect(computeStreak(["2026-04-10", "2026-04-09"], TODAY)).toBe(0);
  });
});
