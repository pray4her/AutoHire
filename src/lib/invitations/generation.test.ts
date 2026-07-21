import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { resolveInviteToken } from "@/lib/application/service";
import { resetEnvForTests } from "@/lib/env";
import {
  buildInvitationGenerationWorkbook,
  formatInvitationExpiryLabel,
  generateInvitationBatch,
  invitationGenerationRequestSchema,
  listInvitationGenerationBatches,
  setInvitationItemDistributed,
} from "@/lib/invitations/generation";
import { INVITATION_GENERATION_PREVIEW_LIMIT } from "@/lib/invitations/constants";
import { findInvitationById } from "@/lib/data/store";

const originalEnv = { ...process.env };

function resetMemoryStore() {
  (
    globalThis as typeof globalThis & {
      __autohireStore?: unknown;
    }
  ).__autohireStore = undefined;
}

describe("invitation generation service", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      APP_RUNTIME_MODE: "memory",
      APP_BASE_URL: "https://example.test",
    };
    resetEnvForTests();
    resetMemoryStore();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetEnvForTests();
    resetMemoryStore();
  });

  it("formats day-based expiry labels in Chinese", () => {
    expect(
      formatInvitationExpiryLabel({
        expiredDays: 90,
        expiredHours: 0,
        expiredMinutes: 0,
      }),
    ).toBe("90 天");
  });

  it("rejects counts above the generation maximum", () => {
    const parsed = invitationGenerationRequestSchema.safeParse({
      algorithm: "SHA256",
      count: 1_000_001,
      idempotencyKey: "invite-test-over-max",
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts the generation maximum count", () => {
    const parsed = invitationGenerationRequestSchema.safeParse({
      algorithm: "SHA256",
      count: 1_000_000,
      idempotencyKey: "invite-test-at-max",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.count).toBe(1_000_000);
    }
  });

  it("returns only a preview of items for large batches", async () => {
    const batch = await generateInvitationBatch(
      invitationGenerationRequestSchema.parse({
        algorithm: "SHA256",
        count: INVITATION_GENERATION_PREVIEW_LIMIT + 4,
        idempotencyKey: "invite-test-preview-limit",
      }),
    );

    expect(batch.createdCount).toBe(INVITATION_GENERATION_PREVIEW_LIMIT + 4);
    expect(batch.requestedCount).toBe(INVITATION_GENERATION_PREVIEW_LIMIT + 4);
    expect(batch.items).toHaveLength(INVITATION_GENERATION_PREVIEW_LIMIT);
    expect(batch.items[0]?.distributedAt).toBeNull();
  });

  it("creates invitations that can be resolved by the selected hash algorithm", async () => {
    const input = invitationGenerationRequestSchema.parse({
      algorithm: "SHA512",
      count: 2,
      expiredDays: 90,
      idempotencyKey: "invite-test-sha512",
    });

    const batch = await generateInvitationBatch(input);

    expect(batch.items).toHaveLength(2);
    expect(batch.items[0]?.plaintextToken).toMatch(/^[0-9a-f]{64}$/);
    expect(batch.items[0]?.inviteLink).toContain(
      "https://example.test/apply?t=",
    );
    expect(batch.items[0]?.hashAlgorithm).toBe("SHA512");

    const invitation = await resolveInviteToken(
      batch.items[0]?.plaintextToken ?? "",
    );
    expect(invitation?.id).toBe(batch.items[0]?.invitationId);
  });

  it("reuses an existing batch for the same idempotency key", async () => {
    const input = invitationGenerationRequestSchema.parse({
      algorithm: "SHA256",
      count: 3,
      idempotencyKey: "invite-test-idempotent",
    });

    const first = await generateInvitationBatch(input);
    const second = await generateInvitationBatch(input);

    expect(second.id).toBe(first.id);
    expect(second.items.map((item) => item.plaintextToken)).toEqual(
      first.items.map((item) => item.plaintextToken),
    );
  });

  it("creates a new batch for a different idempotency key", async () => {
    const first = await generateInvitationBatch(
      invitationGenerationRequestSchema.parse({
        algorithm: "SHA256",
        count: 1,
        idempotencyKey: "invite-test-key-a",
      }),
    );
    const second = await generateInvitationBatch(
      invitationGenerationRequestSchema.parse({
        algorithm: "SHA256",
        count: 1,
        idempotencyKey: "invite-test-key-b",
      }),
    );

    expect(second.id).not.toBe(first.id);
    expect(second.items[0]?.plaintextToken).not.toBe(
      first.items[0]?.plaintextToken,
    );
  });

  it("defaults hours and minutes to 0 for day-based expiry", () => {
    const parsed = invitationGenerationRequestSchema.parse({
      algorithm: "SHA256",
      count: 1,
      expiredDays: 30,
      idempotencyKey: "invite-test-defaults",
    });

    expect(parsed.expiredHours).toBe(0);
    expect(parsed.expiredMinutes).toBe(0);
  });

  it("rejects hours/minutes when expiry days is greater than 0", () => {
    const parsed = invitationGenerationRequestSchema.safeParse({
      algorithm: "SHA256",
      count: 1,
      expiredDays: 1,
      expiredHours: 2,
      expiredMinutes: 0,
      idempotencyKey: "invite-test-mutex",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects zero total duration when expiry days is 0", () => {
    const parsed = invitationGenerationRequestSchema.safeParse({
      algorithm: "SHA256",
      count: 1,
      expiredDays: 0,
      expiredHours: 0,
      expiredMinutes: 0,
      idempotencyKey: "invite-test-zero-duration",
    });

    expect(parsed.success).toBe(false);
  });

  it("creates short-lived invitations from hours and minutes", async () => {
    const before = Date.now();
    const batch = await generateInvitationBatch(
      invitationGenerationRequestSchema.parse({
        algorithm: "SHA256",
        count: 1,
        expiredDays: 0,
        expiredHours: 2,
        expiredMinutes: 30,
        idempotencyKey: "invite-test-short-expiry",
      }),
    );
    const after = Date.now();
    const invitation = await findInvitationById(
      batch.items[0]?.invitationId ?? "",
    );

    expect(batch.expiredDays).toBe(0);
    expect(batch.expiredHours).toBe(2);
    expect(batch.expiredMinutes).toBe(30);
    expect(formatInvitationExpiryLabel(batch)).toBe("2 小时 30 分钟");
    expect(invitation?.expiredAt).toBeInstanceOf(Date);

    const expiredAtMs = invitation?.expiredAt?.getTime() ?? 0;
    const expectedMs = 2 * 60 * 60 * 1000 + 30 * 60 * 1000;
    expect(expiredAtMs).toBeGreaterThanOrEqual(before + expectedMs);
    expect(expiredAtMs).toBeLessThanOrEqual(after + expectedMs);
  });

  it("lists recent batches without item payloads", async () => {
    await generateInvitationBatch(
      invitationGenerationRequestSchema.parse({
        algorithm: "SHA256",
        count: 2,
        idempotencyKey: "invite-test-list-a",
      }),
    );
    await generateInvitationBatch(
      invitationGenerationRequestSchema.parse({
        algorithm: "SHA256",
        count: 1,
        idempotencyKey: "invite-test-list-b",
      }),
    );

    const batches = await listInvitationGenerationBatches(10);

    expect(batches.length).toBeGreaterThanOrEqual(2);
    expect(batches.map((item) => item.createdCount).sort()).toEqual([1, 2]);
    expect(batches[0]).not.toHaveProperty("items");
  });

  it("builds an ops-first workbook with a technical detail sheet", async () => {
    const batch = await generateInvitationBatch(
      invitationGenerationRequestSchema.parse({
        algorithm: "SHA256",
        count: 2,
        idempotencyKey: "invite-test-workbook",
      }),
    );
    const fullBatch = {
      ...batch,
      items: batch.items,
    };
    const bytes = buildInvitationGenerationWorkbook(fullBatch);
    const workbook = XLSX.read(bytes, { type: "buffer" });

    expect(workbook.SheetNames).toEqual(["邀请链接", "技术明细"]);
    const opsSheet = workbook.Sheets["邀请链接"];
    const headerRows = XLSX.utils.sheet_to_json(opsSheet, {
      header: 1,
      defval: "",
    });
    expect(headerRows[0]).toEqual([
      "命名",
      "序号",
      "邀请链接",
      "已发出",
      "失效时间",
    ]);
  });

  it("stores batch name and exposes absolute expiresAt", async () => {
    const before = Date.now();
    const batch = await generateInvitationBatch(
      invitationGenerationRequestSchema.parse({
        algorithm: "SHA256",
        count: 1,
        name: "华东渠道",
        expiredDays: 1,
        idempotencyKey: "invite-test-named-batch",
      }),
    );
    const after = Date.now();

    expect(batch.name).toBe("华东渠道");
    const expiresAtMs = new Date(batch.expiresAt).getTime();
    expect(expiresAtMs).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000);
    expect(expiresAtMs).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000);
  });

  it("marks and unmarks an invitation item as distributed", async () => {
    const batch = await generateInvitationBatch(
      invitationGenerationRequestSchema.parse({
        algorithm: "SHA256",
        count: 1,
        idempotencyKey: "invite-test-distributed",
      }),
    );
    const invitationId = batch.items[0]?.invitationId ?? "";

    const marked = await setInvitationItemDistributed(invitationId, true);
    expect(marked?.distributedAt).toBeTruthy();

    const unmarked = await setInvitationItemDistributed(invitationId, false);
    expect(unmarked?.distributedAt).toBeNull();
  });
});
