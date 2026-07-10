import { describe, expect, it } from "vitest";

import {
  buildCustomerNo,
  formatShanghaiDateKey,
  shanghaiDateStartUtc,
  shanghaiDayRangeToUtcBounds,
} from "@/lib/ops-expert-files/time";
import { CustomerNoQuotaExceededError } from "@/lib/ops-expert-files/time";

describe("ops-expert-files time / customer no formatting", () => {
  it("formats Shanghai date keys around UTC midnight", () => {
    // 2026-07-08 20:00 UTC = 2026-07-09 04:00 Shanghai
    const date = new Date("2026-07-08T20:00:00.000Z");
    expect(formatShanghaiDateKey(date)).toBe("20260709");
  });

  it("builds a 12-digit customer number", () => {
    expect(buildCustomerNo("20260709", 3)).toBe("202607090301");
  });

  it("rejects sequence above 99", () => {
    expect(() => buildCustomerNo("20260709", 100)).toThrow(
      CustomerNoQuotaExceededError,
    );
  });

  it("maps inclusive Shanghai days to UTC half-open range", () => {
    const { start, endExclusive } = shanghaiDayRangeToUtcBounds({
      startDate: "2026-07-01",
      endDate: "2026-07-09",
    });
    expect(start?.toISOString()).toBe(shanghaiDateStartUtc("2026-07-01").toISOString());
    expect(endExclusive?.toISOString()).toBe(
      shanghaiDateStartUtc("2026-07-10").toISOString(),
    );
  });
});
