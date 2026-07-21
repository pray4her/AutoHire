// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InvitationPreviewRows } from "@/features/invitations/components/invitation-preview-rows";
import type { InvitationGenerationItemSummary } from "@/lib/invitations/types";

function createItem(
  sequence: number,
  distributedAt: string | null = null,
): InvitationGenerationItemSummary {
  return {
    sequence,
    invitationId: `invitation_${sequence}`,
    expertId: `generated_${sequence}`,
    plaintextToken: "a".repeat(64),
    tokenHash: "b".repeat(64),
    inviteLink: `https://example.test/apply?t=token-${sequence}`,
    hashAlgorithm: "SHA256",
    distributedAt,
    createdAt: "2026-07-21T00:00:00.000Z",
  };
}

describe("InvitationPreviewRows", () => {
  afterEach(() => {
    cleanup();
  });

  it("marks a row as distributed when the row is clicked", async () => {
    const onSetDistributed = vi.fn();
    const user = userEvent.setup();
    const items = [createItem(1), createItem(2)];

    render(
      <InvitationPreviewRows
        batchName="测试批次"
        expiresAt="2026-10-19T12:00:00.000Z"
        items={items}
        totalCount={2}
        onSetDistributed={onSetDistributed}
      />,
    );

    await user.click(screen.getByText("https://example.test/apply?t=token-1"));

    expect(onSetDistributed).toHaveBeenCalledWith(["invitation_1"], true);
  });

  it("paints multiple rows while dragging", async () => {
    const onSetDistributed = vi.fn();
    const user = userEvent.setup();
    const items = [createItem(1), createItem(2), createItem(3)];

    render(
      <InvitationPreviewRows
        batchName="测试批次"
        expiresAt="2026-10-19T12:00:00.000Z"
        items={items}
        totalCount={3}
        onSetDistributed={onSetDistributed}
      />,
    );

    const firstRow = screen.getByText(
      "https://example.test/apply?t=token-1",
    ).closest("tr");
    const secondRow = screen.getByText(
      "https://example.test/apply?t=token-2",
    ).closest("tr");
    const thirdRow = screen.getByText(
      "https://example.test/apply?t=token-3",
    ).closest("tr");

    expect(firstRow).toBeTruthy();
    expect(secondRow).toBeTruthy();
    expect(thirdRow).toBeTruthy();

    await user.pointer([
      { keys: "[MouseLeft>]", target: firstRow as HTMLElement },
      { target: secondRow as HTMLElement },
      { target: thirdRow as HTMLElement },
      { keys: "[/MouseLeft]" },
    ]);

    expect(onSetDistributed).toHaveBeenCalledWith(
      ["invitation_1", "invitation_2", "invitation_3"],
      true,
    );
  });
});
