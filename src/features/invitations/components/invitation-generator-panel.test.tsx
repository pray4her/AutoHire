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

function mockFetchSequence(
  handlers: Array<(input: RequestInfo | URL, init?: RequestInit) => Response>,
) {
  let index = 0;
  vi.mocked(fetch).mockImplementation((input, init) => {
    const handler = handlers[Math.min(index, handlers.length - 1)];
    index += 1;
    return Promise.resolve(handler(input, init));
  });
}

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
    mockFetchSequence([
      () =>
        new Response(JSON.stringify({ batches: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      () =>
        new Response(null, {
          status: 500,
        }),
    ]);
    const user = userEvent.setup();
    render(<InvitationGeneratorPanel />);

    expect(screen.getByText("邀请链接")).toBeInTheDocument();
    expect(screen.getByText("高级设置")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "生成邀请链接" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "邀请链接生成失败（HTTP 500）。",
      );
    });
    expect(toast.error).not.toHaveBeenCalledWith(
      expect.stringContaining("Unexpected end of JSON input"),
    );
  });

  it("localizes known generation API errors", async () => {
    mockFetchSequence([
      () =>
        new Response(JSON.stringify({ batches: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      () =>
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
    ]);
    const user = userEvent.setup();
    render(<InvitationGeneratorPanel />);

    await user.click(screen.getByRole("button", { name: "生成邀请链接" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("需要有效的运营后台登录会话。");
    });
  });

  it("toggles the distributed checkbox for a generated invitation", async () => {
    const batch = {
      id: "invite_batch_test",
      name: "面板测试",
      idempotencyKey: "panel-distributed-key",
      hashAlgorithm: "SHA256",
      requestedCount: 1,
      createdCount: 1,
      expiredDays: 90,
      expiredHours: 0,
      expiredMinutes: 0,
      expiresAt: "2026-10-19T00:00:00.000Z",
      createdAt: "2026-07-21T00:00:00.000Z",
      updatedAt: "2026-07-21T00:00:00.000Z",
      items: [
        {
          sequence: 1,
          invitationId: "invitation_1",
          expertId: "generated_1",
          plaintextToken: "a".repeat(64),
          tokenHash: "b".repeat(64),
          inviteLink: "https://example.test/apply?t=token",
          hashAlgorithm: "SHA256",
          distributedAt: null,
          createdAt: "2026-07-21T00:00:00.000Z",
        },
      ],
    };

    mockFetchSequence([
      () =>
        new Response(JSON.stringify({ batches: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      () =>
        new Response(JSON.stringify({ batch }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      () =>
        new Response(JSON.stringify({ batches: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      (_input, init) => {
        expect(init?.method).toBe("PATCH");
        expect(JSON.parse(String(init?.body))).toEqual({ distributed: true });
        return new Response(
          JSON.stringify({
            item: {
              ...batch.items[0],
              distributedAt: "2026-07-21T01:00:00.000Z",
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    ]);

    const user = userEvent.setup();
    render(<InvitationGeneratorPanel />);

    await user.click(screen.getByRole("button", { name: "生成邀请链接" }));

    await waitFor(() => {
      expect(
        screen.getByText("https://example.test/apply?t=token"),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByText("https://example.test/apply?t=token"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("已标记为已发出。");
    });
  });
});
