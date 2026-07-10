import { beforeEach, describe, expect, it } from "vitest";

import {
  allocateCustomerNo,
  resetCustomerNoCountersForTests,
} from "@/lib/ops-expert-files/customer-no";
import { CustomerNoQuotaExceededError } from "@/lib/ops-expert-files/time";

describe("allocateCustomerNo (memory)", () => {
  beforeEach(() => {
    process.env.APP_RUNTIME_MODE = "memory";
    resetCustomerNoCountersForTests();
  });

  it("allocates sequential numbers for the same Shanghai day", async () => {
    const at = new Date("2026-07-08T20:00:00.000Z");
    const first = await allocateCustomerNo({ resumeUploadedAt: at });
    const second = await allocateCustomerNo({ resumeUploadedAt: at });
    expect(first).toBe("202607090101");
    expect(second).toBe("202607090201");
  });

  it("throws when daily quota is exceeded", async () => {
    const at = new Date("2026-07-08T20:00:00.000Z");
    for (let index = 0; index < 99; index += 1) {
      await allocateCustomerNo({ resumeUploadedAt: at });
    }
    await expect(allocateCustomerNo({ resumeUploadedAt: at })).rejects.toBeInstanceOf(
      CustomerNoQuotaExceededError,
    );
  });
});
