import { beforeEach, describe, expect, it } from "vitest";

import { ensureAccountApplication } from "@/lib/account-auth/shadow-invitation";
import { listExpertFiles } from "@/lib/ops-expert-files/query";

function resetMemoryStore() {
  (
    globalThis as typeof globalThis & {
      __autohireStore?: unknown;
    }
  ).__autohireStore = undefined;
}

type MemoryApplication = {
  id: string;
  customerNo: string | null;
  resumeUploadedAt: Date | null;
};

async function memoryStore() {
  const { getApplicationById } = await import("@/lib/data/store");
  // Force the sample store to initialize, then hand back the live reference.
  await getApplicationById("app_intro");

  return (
    globalThis as typeof globalThis & {
      __autohireStore: { applications: MemoryApplication[] };
    }
  ).__autohireStore;
}

function markListable(applicationId: string, customerNo: string, at: Date) {
  return memoryStore().then((store) => {
    const record = store.applications.find((item) => item.id === applicationId);
    expect(record).toBeDefined();
    record!.customerNo = customerNo;
    record!.resumeUploadedAt = at;
  });
}

async function seedOneApplicationPerTrack() {
  const now = new Date();
  await markListable("app_intro", "CUST-OPS-1", now);

  const { application: accountApplication } = await ensureAccountApplication({
    userId: "user_ops_view",
    email: "ops-view@example.com",
  });
  await markListable(accountApplication.id, "CUST-ACCOUNT-1", now);

  return { accountApplicationId: accountApplication.id };
}

const baseQuery = {
  q: "",
  status: "all" as const,
  startDate: null,
  endDate: null,
  page: 1,
  pageSize: 20,
};

describe("listExpertFiles invitation source marker", () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  it("distinguishes account-track and link-track applications", async () => {
    const { accountApplicationId } = await seedOneApplicationPerTrack();

    const result = await listExpertFiles({ ...baseQuery, source: "all" });

    const linkItem = result.items.find(
      (item) => item.applicationId === "app_intro",
    );
    expect(linkItem?.invitationSource).toBe("OPS");

    const accountItem = result.items.find(
      (item) => item.applicationId === accountApplicationId,
    );
    expect(accountItem?.invitationSource).toBe("ACCOUNT");
    expect(accountItem?.invitationEmail).toBe("ops-view@example.com");
  });

  it("filters applications by invitation source", async () => {
    const { accountApplicationId } = await seedOneApplicationPerTrack();

    const accountOnly = await listExpertFiles({
      ...baseQuery,
      source: "ACCOUNT",
    });
    expect(accountOnly.items.length).toBeGreaterThan(0);
    expect(
      accountOnly.items.every((item) => item.invitationSource === "ACCOUNT"),
    ).toBe(true);
    expect(
      accountOnly.items.some(
        (item) => item.applicationId === accountApplicationId,
      ),
    ).toBe(true);

    const opsOnly = await listExpertFiles({ ...baseQuery, source: "OPS" });
    expect(opsOnly.items.length).toBeGreaterThan(0);
    expect(
      opsOnly.items.every((item) => item.invitationSource === "OPS"),
    ).toBe(true);
    expect(
      opsOnly.items.some((item) => item.applicationId === "app_intro"),
    ).toBe(true);
  });
});
