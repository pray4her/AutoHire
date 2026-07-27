import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { e2eOpsCredentials } from "../../playwright.config";

const REFERRER_APPLICATION_ID = "app_submitted";
const REFERRER_NAME = "Submitted Expert";

async function resetMemory(request: APIRequestContext) {
  const response = await request.post("/api/test/reset-memory");
  expect(response.ok()).toBeTruthy();
}

async function loginOps(page: Page) {
  await page.goto("/ops/expert-files/login");
  await page.locator("#ops-username").fill(e2eOpsCredentials.username);
  await page.locator("#ops-password").fill(e2eOpsCredentials.password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/ops\/expert-files$/);
  await expect(
    page.getByRole("heading", { name: "推荐链接管理" }),
  ).toBeVisible();
}

async function generateReferralLink(page: Page): Promise<string> {
  await page.locator("#referral-expert").selectOption(REFERRER_APPLICATION_ID);
  await expect(
    page.getByRole("button", { name: "生成推荐链接" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "生成推荐链接" }).click();
  const link = page.locator("p.font-mono").filter({ hasText: "/referral?t=" });
  await expect(link).toBeVisible({ timeout: 15_000 });
  const href = (await link.textContent())?.trim();
  expect(href).toBeTruthy();
  expect(href).toContain("/referral?t=");
  return href!;
}

async function fetchRecordedOtp(
  request: APIRequestContext,
  email: string,
): Promise<string> {
  await expect
    .poll(
      async () => {
        const response = await request.get(
          `/api/test/recorded-otp?email=${encodeURIComponent(email)}`,
        );
        if (!response.ok()) {
          return null;
        }
        const body = (await response.json()) as { otp?: string };
        return body.otp ?? null;
      },
      { timeout: 20_000 },
    )
    .toMatch(/^\d{6}$/);

  const response = await request.get(
    `/api/test/recorded-otp?email=${encodeURIComponent(email)}`,
  );
  const body = (await response.json()) as { otp: string };
  return body.otp;
}

async function registerFriend(
  page: Page,
  request: APIRequestContext,
  email: string,
  password: string,
) {
  await expect(page.getByRole("heading", { name: "注册账号" })).toBeVisible();
  await page.locator("#signup-email").fill(email);
  await page.locator("#signup-password").fill(password);
  await page.getByRole("button", { name: "发送验证码并注册" }).click();
  await expect(page.locator("#signup-otp")).toBeVisible({ timeout: 15_000 });

  const otp = await fetchRecordedOtp(request, email);
  await page.locator("#signup-otp").fill(otp);
  await page.getByRole("button", { name: "完成验证并登录" }).click();
  await expect(page).toHaveURL(/\/account$/, { timeout: 20_000 });
  await expect(page.getByText(email)).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  await resetMemory(request);
});

test("friend referral journey attributes registration in ops views", async ({
  page,
  request,
  context,
}) => {
  test.setTimeout(120_000);

  const friendEmail = `friend-${Date.now()}@example.com`;
  const friendPassword = "friend-pass-42";

  try {
    // 1. Ops generates a referral link for a listable sample expert.
    await loginOps(page);
    const referralLink = await generateReferralLink(page);
    const referralPath =
      new URL(referralLink).pathname + new URL(referralLink).search;

    // 2–4. Friend opens landing → 开始申报 → registers with email OTP.
    const friendPage = await context.newPage();
    await friendPage.goto(referralPath);
    await expect(
      friendPage.getByRole("heading", {
        name: new RegExp(`来自 ${REFERRER_NAME}`),
      }),
    ).toBeVisible({ timeout: 15_000 });
    await friendPage.getByRole("link", { name: "开始申报" }).click();
    await expect(friendPage).toHaveURL(/\/signup/);
    await registerFriend(friendPage, request, friendEmail, friendPassword);

    // 5. Enter the account-track application flow.
    await friendPage.getByText("进入我的申报").click();
    await expect(friendPage).toHaveURL(/\/apply/, { timeout: 20_000 });
    await expect(
      friendPage.getByText(/Global Excellent Scientists Fund|GESF/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    // 6. Attribution is visible in the ops referral funnel.
    const funnelResponse = await page.request.get(
      `/api/ops/referral-tokens/${REFERRER_APPLICATION_ID}`,
    );
    expect(funnelResponse.ok()).toBeTruthy();
    const funnelBody = (await funnelResponse.json()) as {
      token: {
        funnel: {
          clickCount: number;
          registrationCount: number;
          applicationCount: number;
        };
      } | null;
    };
    expect(funnelBody.token).not.toBeNull();
    expect(funnelBody.token!.funnel.clickCount).toBeGreaterThanOrEqual(1);
    expect(funnelBody.token!.funnel.registrationCount).toBeGreaterThanOrEqual(1);
    expect(funnelBody.token!.funnel.applicationCount).toBeGreaterThanOrEqual(1);

    // Make the friend's application listable, then assert the expert-files
    // "推荐来源" column resolves to the referring expert.
    const seedResponse = await request.post(
      "/api/test/seed-listable-application",
      {
        data: { email: friendEmail, customerNo: "E2E-FRIEND-1" },
      },
    );
    expect(seedResponse.ok()).toBeTruthy();

    await page.goto("/ops/expert-files");
    await page.locator("#expert-q").fill(friendEmail);
    await page.getByRole("button", { name: "搜索" }).click();
    const friendRow = page.getByRole("row").filter({ hasText: friendEmail });
    await expect(friendRow).toBeVisible({ timeout: 15_000 });
    await expect(friendRow).toContainText("账号注册");
    await expect(friendRow).toContainText(REFERRER_NAME);
  } finally {
    await request.post("/api/test/cleanup-account", {
      data: { email: friendEmail },
    });
  }
});
