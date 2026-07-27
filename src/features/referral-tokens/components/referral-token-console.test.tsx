// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ReferralTokenConsole } from "@/features/referral-tokens/components/referral-token-console";

const experts = [
  {
    applicationId: "app_intro",
    expertId: "expert_init",
    customerNo: "GESF-2026-001",
    name: "张专家",
    email: "expert@example.com",
  },
] as const;

describe("ReferralTokenConsole", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it("shows privacy-safe display-field defaults", () => {
    render(<ReferralTokenConsole initialExperts={experts} />);

    expect(
      screen.getByText("该页面对任何拿到链接的人公开可见"),
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "姓名" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "姓名" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("checkbox", { name: "邮箱" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "电话" })).not.toBeChecked();
  });

  it("generates and copies a one-time referral link", async () => {
    vi.mocked(fetch).mockImplementation((_input, init) => {
      if (init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({
          displayFields: ["NAME", "TITLE", "ORGANIZATION"],
        });
        return Promise.resolve(
          Response.json({
            token: {
              id: "referral-token-1",
              applicationId: "app_intro",
              expertId: "expert_init",
              displayFields: ["NAME", "TITLE", "ORGANIZATION"],
              status: "ACTIVE",
              createdAt: "2026-07-27T00:00:00.000Z",
              updatedAt: "2026-07-27T00:00:00.000Z",
              expiredAt: "2026-10-25T00:00:00.000Z",
            },
            plaintextToken: "a".repeat(64),
            referralLink: "https://example.test/referral?t=one-time-token",
          }),
        );
      }

      return Promise.resolve(Response.json({ token: null }));
    });
    const user = userEvent.setup();
    render(<ReferralTokenConsole initialExperts={experts} />);

    await user.click(
      await screen.findByRole("button", { name: "生成推荐链接" }),
    );

    expect(
      await screen.findByText("https://example.test/referral?t=one-time-token"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("链接与明文 token 仅在本次生成后展示一次"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "复制链接" }));
    expect(await navigator.clipboard.readText()).toBe(
      "https://example.test/referral?t=one-time-token",
    );
  });

  it("disables an active referral token from the console", async () => {
    const activeToken = {
      id: "referral-token-1",
      applicationId: "app_intro",
      expertId: "expert_init",
      displayFields: ["NAME", "TITLE"],
      status: "ACTIVE",
      createdAt: "2026-07-27T00:00:00.000Z",
      updatedAt: "2026-07-27T00:00:00.000Z",
      expiredAt: "2026-10-25T00:00:00.000Z",
    } as const;
    vi.mocked(fetch).mockImplementation((_input, init) => {
      if (init?.method === "PATCH") {
        expect(JSON.parse(String(init.body))).toEqual({ action: "DISABLE" });
        return Promise.resolve(
          Response.json({
            token: { ...activeToken, status: "DISABLED" },
          }),
        );
      }
      return Promise.resolve(Response.json({ token: activeToken }));
    });
    const user = userEvent.setup();
    render(<ReferralTokenConsole initialExperts={experts} />);

    await user.click(await screen.findByRole("button", { name: "作废" }));

    expect(await screen.findByText("已作废")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "重新生成" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "续期 90 天" }),
    ).not.toBeInTheDocument();
  });

  it("clears sensitive fields and stale actions when switching experts", async () => {
    const secondRequest = Promise.withResolvers<Response>();
    const activeToken = {
      id: "referral-token-1",
      applicationId: "app_intro",
      expertId: "expert_init",
      displayFields: ["NAME", "EMAIL", "PHONE"],
      status: "ACTIVE",
      createdAt: "2026-07-27T00:00:00.000Z",
      updatedAt: "2026-07-27T00:00:00.000Z",
      expiredAt: "2026-10-25T00:00:00.000Z",
    } as const;
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json({ token: activeToken }))
      .mockImplementationOnce(() => secondRequest.promise);
    const user = userEvent.setup();
    render(
      <ReferralTokenConsole
        initialExperts={[
          ...experts,
          {
            applicationId: "app_second",
            expertId: "expert_second",
            customerNo: "GESF-2026-002",
            name: "李专家",
            email: "second@example.com",
          },
        ]}
      />,
    );
    expect(await screen.findByRole("checkbox", { name: "邮箱" })).toBeChecked();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "专家档案" }),
      "app_second",
    );

    expect(screen.getByRole("checkbox", { name: "邮箱" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "电话" })).not.toBeChecked();
    expect(
      screen.queryByRole("button", { name: "作废" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("正在加载推荐 token…")).toBeInTheDocument();

    secondRequest.resolve(Response.json({ token: null }));
    expect(
      await screen.findByRole("button", { name: "生成推荐链接" }),
    ).toBeInTheDocument();
  });

  it("searches experts beyond the initial page", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith("/api/ops/referral-tokens/experts?")) {
        return Promise.resolve(
          Response.json({
            items: [
              {
                applicationId: "app_searched",
                expertId: "expert_searched",
                customerNo: "GESF-2026-999",
                name: "李专家",
                email: "searched@example.com",
              },
            ],
          }),
        );
      }
      return Promise.resolve(Response.json({ token: null }));
    });
    const user = userEvent.setup();
    render(<ReferralTokenConsole initialExperts={experts} />);

    await user.type(screen.getByRole("searchbox", { name: "搜索专家" }), "李");
    await user.click(screen.getByRole("button", { name: "查找专家" }));

    expect(
      await screen.findByRole("option", { name: "李专家 · GESF-2026-999" }),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("q=%E6%9D%8E"),
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
