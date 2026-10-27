import { computeStreak, localDate } from "./streakMath";

// Fixed "today" for all streak tests: January 5, 2026.
const TODAY = "2026-01-05";
const YESTERDAY = "2026-01-04";
const TWO_DAYS_AGO = "2026-01-03";
const THREE_DAYS_AGO = "2026-01-02";

describe("computeStreak", () => {
  it("returns 0 for an empty list of dates", () => {
    expect(computeStreak([], TODAY)).toBe(0);
  });

  it("returns 1 when only today is logged", () => {
    expect(computeStreak([TODAY], TODAY)).toBe(1);
  });

  it("returns 3 for today, yesterday and the day before", () => {
    expect(computeStreak([TODAY, YESTERDAY, TWO_DAYS_AGO], TODAY)).toBe(3);
  });

  it("returns 2 when yesterday and the day before are logged but today is not", () => {
    expect(computeStreak([YESTERDAY, TWO_DAYS_AGO], TODAY)).toBe(2);
  });

  it("returns 1 when today and two days ago are logged but yesterday is missing", () => {
    expect(computeStreak([TODAY, TWO_DAYS_AGO], TODAY)).toBe(1);
  });

  it("does not depend on the input order", () => {
    const dates = [TODAY, YESTERDAY, TWO_DAYS_AGO];
    const reversed = [...dates].reverse();
    expect(computeStreak(reversed, TODAY)).toBe(computeStreak(dates, TODAY));
  });

  it("does not count duplicate dates", () => {
    expect(computeStreak([TODAY, TODAY, TODAY], TODAY)).toBe(1);
    expect(computeStreak([TODAY, TODAY, YESTERDAY], TODAY)).toBe(2);
  });

  it("returns 0 when the only logged date is older than yesterday", () => {
    expect(computeStreak([THREE_DAYS_AGO], TODAY)).toBe(0);
  });

  describe("DST transitions (America/Los_Angeles)", () => {
    // DST starts 2026-03-08: 2026-03-07 is 23h long, 2026-03-08 is 25h long.
    it("counts a streak across the spring-forward transition", () => {
      expect(computeStreak(["2026-03-08", "2026-03-09"], "2026-03-09")).toBe(2);
    });

    it("counts a 3-day streak spanning the spring-forward transition", () => {
      expect(computeStreak(["2026-03-07", "2026-03-08", "2026-03-09"], "2026-03-09")).toBe(3);
    });

    // DST ends 2026-11-01: 2026-11-01 is 25h long.
    it("counts a 3-day streak spanning the fall-back transition", () => {
      expect(computeStreak(["2026-10-31", "2026-11-01", "2026-11-02"], "2026-11-02")).toBe(3);
    });
  });
});

describe("localDate", () => {
  it("formats a date with zero-padded month and day", () => {
    expect(localDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
