// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApplyExpiredInviteDialog,
  EXPIRED_INVITE_NOTICE_DESCRIPTION,
  EXPIRED_INVITE_NOTICE_TITLE,
} from "@/features/application/components/apply-expired-invite-dialog";
import {
  TALENT_CONSULTANT_EMAIL,
  TALENT_CONSULTANT_PHONE,
  TALENT_CONSULTANT_WHATSAPP_URL,
} from "@/features/application/components/apply-entry-intro-content";

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

describe("ApplyExpiredInviteDialog", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the expired notice copy and consultant contact links", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(
      <ApplyExpiredInviteDialog
        isOpen
        onOpenChange={vi.fn()}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByText("Important Notice")).toBeInTheDocument();
    expect(screen.getByText(EXPIRED_INVITE_NOTICE_TITLE)).toBeInTheDocument();
    expect(
      screen.getByText(EXPIRED_INVITE_NOTICE_DESCRIPTION),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Email/i }),
    ).toHaveAttribute("href", `mailto:${TALENT_CONSULTANT_EMAIL}`);
    expect(screen.getByText(TALENT_CONSULTANT_EMAIL)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /WhatsApp/i }),
    ).toHaveAttribute("href", TALENT_CONSULTANT_WHATSAPP_URL);
    expect(screen.getByText(TALENT_CONSULTANT_PHONE)).toBeInTheDocument();
    expect(screen.queryByText("Don't show this again")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "I understand" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
