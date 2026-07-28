import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

import { e2eOpsCredentials } from "../../playwright.config";

async function resetMemory(request: APIRequestContext) {
  const response = await request.post("/api/test/reset-memory");
  expect(response.ok()).toBeTruthy();
}

async function loginOps(page: Page) {
  await page.goto("/ops/expert-files/login?next=/ops/referrals");
  await page.locator("#ops-username").fill(e2eOpsCredentials.username);
  await page.locator("#ops-password").fill(e2eOpsCredentials.password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/ops\/referrals$/);
  await expect(page.getByText("推荐链接", { exact: true })).toBeVisible();
}

async function generateReferralLink(page: Page): Promise<string> {
  const email = `referrer-${Date.now()}@example.com`;
  await page
    .getByPlaceholder("name@example.com, 张三")
    .fill(`${email}, 推荐人甲`);
  await page.getByRole("button", { name: "生成链接" }).click();
  await expect(page.getByText(email)).toBeVisible({ timeout: 15_000 });
  const link = page
    .locator("p.font-mono")
    .filter({ hasText: "/referral?t=" })
    .first();
  await expect(link).toBeVisible();
  const href = (await link.textContent())?.trim();
  expect(href).toBeTruthy();
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
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await page.locator("#signup-email").fill(email);
  await page.getByRole("button", { name: "Send Code" }).click();

  const otp = await fetchRecordedOtp(request, email);
  await page.locator("#signup-password").fill(password);
  await page.locator("#signup-otp").fill(otp);
  await page.getByRole("button", { name: "Create Account" }).click();

  // The intro was confirmed on the referral landing, so the referral-
  // attributed registration continues straight to the CV upload page.
  await expect(page).toHaveURL(/\/apply\/resume/, { timeout: 20_000 });
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
    await loginOps(page);
    const referralLink = await generateReferralLink(page);
    const referralPath =
      new URL(referralLink).pathname + new URL(referralLink).search;

    const friendPage = await context.newPage();
    await friendPage.goto(referralPath);
    // The referral landing mirrors the /apply entry, including the Important
    // Notice dialog, which must be acknowledged before continuing.
    const understandButton = friendPage.getByRole("button", {
      name: "I understand",
    });
    await expect(understandButton).toBeVisible({ timeout: 15_000 });
    await understandButton.click();
    const continueButton = friendPage.getByRole("button", {
      name: "Continue to CV Submission",
    });
    await expect(continueButton).toBeVisible({ timeout: 15_000 });
    await continueButton.click();
    await expect(friendPage).toHaveURL(/\/signup\?next=/);
    await registerFriend(friendPage, request, friendEmail, friendPassword);

    await page.reload();
    await expect(page.getByText("推荐人甲")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("注册 1")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "展开下游" }).first().click();
    await expect(page.getByText(friendEmail)).toBeVisible();
    await expect(page.getByText("已注册未上传")).toBeVisible();
  } finally {
    await request.post("/api/test/cleanup-account", {
      data: { email: friendEmail },
    });
  }
});
