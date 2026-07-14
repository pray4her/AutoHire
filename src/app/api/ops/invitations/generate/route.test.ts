import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import * as XLSX from "xlsx";

import { GET as exportBatch } from "@/app/api/ops/invitations/batches/[batchId]/export/route";
import { POST as generateBatch } from "@/app/api/ops/invitations/generate/route";
import { POST as login } from "@/app/api/ops/expert-files/auth/login/route";
import { resetOpsExpertFilesAccountsForTests } from "@/lib/ops-expert-files/account-auth";
import { getOpsExpertFilesCookieName } from "@/lib/ops-expert-files/session";
import { resetEnvForTests } from "@/lib/env";
import type { InvitationGenerationBatchSummary } from "@/lib/invitations/generation";

const originalEnv = { ...process.env };

type GeneratePayload = {
  readonly batch: InvitationGenerationBatchSummary;
};

function resetMemoryStore() {
  (
    globalThis as typeof globalThis & {
      __autohireStore?: unknown;
    }
  ).__autohireStore = undefined;
}

async function authCookieHeader() {
  const loginResponse = await login(
    new NextRequest("http://localhost/api/ops/expert-files/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "ops",
        password: "initial-pass-123",
      }),
    }),
  );
  expect(loginResponse.status).toBe(200);

  const setCookie = loginResponse.headers.get("set-cookie") ?? "";
  const cookieValue =
    setCookie.match(
      new RegExp(`${getOpsExpertFilesCookieName()}=([^;]+)`),
    )?.[1] ?? "";
  expect(cookieValue).toBeTruthy();

  return `${getOpsExpertFilesCookieName()}=${cookieValue}`;
}

function createGenerateRequest(body: unknown, cookieHeader?: string) {
  return new NextRequest("http://localhost/api/ops/invitations/generate", {
    method: "POST",
    headers: cookieHeader
      ? {
          cookie: cookieHeader,
          "content-type": "application/json",
        }
      : { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("ops invitation generation routes", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      APP_RUNTIME_MODE: "memory",
      APP_BASE_URL: "https://example.test",
      INVITE_TOKEN_SECRET: "ops-route-secret",
      OPS_EXPERT_FILES_USERNAME: "ops",
      OPS_EXPERT_FILES_INITIAL_PASSWORD: "initial-pass-123",
      OPS_EXPERT_FILES_COOKIE_NAME: "ops_ef_test_cookie",
      OPS_EXPERT_FILES_COOKIE_MAX_AGE_SECONDS: "300",
    };
    resetEnvForTests();
    resetMemoryStore();
    resetOpsExpertFilesAccountsForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetEnvForTests();
    resetMemoryStore();
    resetOpsExpertFilesAccountsForTests();
  });

  it("requires an expert-files session cookie", async () => {
    const response = await generateBatch(
      createGenerateRequest({
        algorithm: "SHA256",
        count: 1,
        idempotencyKey: "route-unauthorized",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "OPS_EXPERT_FILES_SESSION_REQUIRED",
    });
  });

  it("rejects invalid generation payloads", async () => {
    const cookie = await authCookieHeader();
    const response = await generateBatch(
      createGenerateRequest(
        {
          algorithm: "MD5",
          count: 100_001,
          idempotencyKey: "bad",
        },
        cookie,
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVITATION_GENERATION_INVALID_PAYLOAD",
    });
  });

  it("generates an idempotent batch", async () => {
    const cookie = await authCookieHeader();
    const body = {
      algorithm: "SHA384",
      count: 2,
      expiredDays: 30,
      idempotencyKey: "route-idempotent-key",
    };

    const first = await generateBatch(createGenerateRequest(body, cookie));
    const second = await generateBatch(createGenerateRequest(body, cookie));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const firstPayload = (await first.json()) as GeneratePayload;
    const secondPayload = (await second.json()) as GeneratePayload;

    expect(secondPayload.batch.id).toBe(firstPayload.batch.id);
    expect(
      secondPayload.batch.items.map((item) => item.plaintextToken),
    ).toEqual(firstPayload.batch.items.map((item) => item.plaintextToken));
  });

  it("exports the generated batch as an Excel workbook", async () => {
    const cookie = await authCookieHeader();
    const generated = await generateBatch(
      createGenerateRequest(
        {
          algorithm: "SHA256",
          count: 2,
          idempotencyKey: "route-export-key",
        },
        cookie,
      ),
    );
    const payload = (await generated.json()) as GeneratePayload;
    const response = await exportBatch(
      new NextRequest(
        `http://localhost/api/ops/invitations/batches/${payload.batch.id}/export`,
        { headers: { cookie } },
      ),
      { params: Promise.resolve({ batchId: payload.batch.id }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("content-disposition")).toContain(
      "filename*=UTF-8''%E9%82%80%E8%AF%B7%E4%BB%A4%E7%89%8C-",
    );

    const bytes = Buffer.from(await response.arrayBuffer());
    const workbook = XLSX.read(bytes, { type: "buffer" });
    const sheet = workbook.Sheets["邀请令牌"];
    expect(sheet).toBeDefined();

    const headerRows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    });
    expect(headerRows[0]).toEqual([
      "序号",
      "邀请 ID",
      "专家 ID",
      "原始令牌",
      "邀请链接",
      "哈希算法",
      "失效时间",
      "创建时间",
    ]);

    const dataRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    expect(dataRows).toHaveLength(2);
  });
});
