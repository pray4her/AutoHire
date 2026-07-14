// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InvitationGeneratorPanel } from "@/features/invitations/components/invitation-generator-panel";
import { toast } from "sonner";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("InvitationGeneratorPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it("shows a clear error when generation returns an empty response body", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, {
        status: 500,
      }),
    );
    const user = userEvent.setup();
    render(<InvitationGeneratorPanel />);

    expect(
      screen.getByText("64 位十六进制哈希，兼容现有邀请链接"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "生成" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "邀请令牌生成失败（HTTP 500）。",
      );
    });
    expect(toast.error).not.toHaveBeenCalledWith(
      expect.stringContaining("Unexpected end of JSON input"),
    );
  });

  it("localizes known generation API errors", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "OPS_EXPERT_FILES_SESSION_REQUIRED",
          error: "需要有效的运营后台登录会话。",
        }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    const user = userEvent.setup();
    render(<InvitationGeneratorPanel />);

    await user.click(screen.getByRole("button", { name: "生成" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("需要有效的运营后台登录会话。");
    });
  });
});
