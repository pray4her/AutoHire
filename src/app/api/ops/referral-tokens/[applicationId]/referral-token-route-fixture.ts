import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect } from "vitest";

import { POST as login } from "@/app/api/ops/expert-files/auth/login/route";
import { resetEnvForTests } from "@/lib/env";
import { resetOpsExpertFilesAccountsForTests } from "@/lib/ops-expert-files/account-auth";
import { getOpsExpertFilesCookieName } from "@/lib/ops-expert-files/session";

const originalEnv = { ...process.env };

type StoredReferralToken = {
  readonly id: string;
  readonly tokenHash: string;
  readonly status: "ACTIVE" | "DISABLED";
  readonly createdBy: string;
};

function resetMemoryStores(): void {
  (
    globalThis as typeof globalThis & {
      __autohireStore?: unknown;
      __autohireReferralTokenStore?: unknown;
      __autohireReferralClickLogStore?: unknown;
    }
  ).__autohireStore = undefined;
  (
    globalThis as typeof globalThis & {
      __autohireReferralTokenStore?: unknown;
    }
  ).__autohireReferralTokenStore = undefined;
  (
    globalThis as typeof globalThis & {
      __autohireReferralClickLogStore?: unknown;
    }
  ).__autohireReferralClickLogStore = undefined;
}

export function setupReferralTokenRouteTests(): void {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      APP_RUNTIME_MODE: "memory",
      APP_BASE_URL: "https://example.test",
      INVITE_TOKEN_SECRET: "ops-referral-route-secret",
      OPS_EXPERT_FILES_USERNAME: "ops",
      OPS_EXPERT_FILES_INITIAL_PASSWORD: "initial-pass-123",
      OPS_EXPERT_FILES_COOKIE_NAME: "ops_ef_referral_test_cookie",
      OPS_EXPERT_FILES_COOKIE_MAX_AGE_SECONDS: "300",
    };
    resetEnvForTests();
    resetMemoryStores();
    resetOpsExpertFilesAccountsForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetEnvForTests();
    resetMemoryStores();
    resetOpsExpertFilesAccountsForTests();
  });
}

export function storedReferralTokens(): readonly StoredReferralToken[] {
  return (
    (
      globalThis as typeof globalThis & {
        __autohireReferralTokenStore?: {
          readonly tokens: readonly StoredReferralToken[];
        };
      }
    ).__autohireReferralTokenStore?.tokens ?? []
  );
}

export async function authCookieHeader(): Promise<string> {
  const response = await login(
    new NextRequest("http://localhost/api/ops/expert-files/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "ops",
        password: "initial-pass-123",
      }),
    }),
  );
  expect(response.status).toBe(200);

  const setCookie = response.headers.get("set-cookie") ?? "";
  const cookieValue =
    setCookie.match(
      new RegExp(`${getOpsExpertFilesCookieName()}=([^;]+)`),
    )?.[1] ?? "";
  expect(cookieValue).toBeTruthy();
  return `${getOpsExpertFilesCookieName()}=${cookieValue}`;
}

export function createPostRequest(
  body: unknown,
  cookie: string,
  applicationId = "app_intro",
): NextRequest {
  return new NextRequest(
    `http://localhost/api/ops/referral-tokens/${applicationId}`,
    {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
}

export async function seedSecondApplicationForExpert(
  applicationId: string,
): Promise<void> {
  const { getApplicationById } = await import("@/lib/data/store");
  await getApplicationById("app_intro");
  const store = (
    globalThis as typeof globalThis & {
      __autohireStore?: {
        readonly applications: Array<
          { id: string; expertId: string } & Record<string, unknown>
        >;
      };
    }
  ).__autohireStore;
  const original = store?.applications.find(
    (application) => application.id === "app_intro",
  );
  if (!store || !original) {
    throw new Error("Referral route fixture could not find app_intro.");
  }
  store.applications.push({ ...original, id: applicationId });
}
