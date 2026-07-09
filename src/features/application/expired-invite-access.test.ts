import { describe, expect, it, vi } from "vitest";

import { ApplicationClientError } from "@/features/application/client";
import {
  EXPIRED_INVITE_APPLY_PATH,
  isExpiredInviteAccessError,
  redirectToExpiredInviteReadOnly,
} from "@/features/application/expired-invite-access";

describe("expired invite access helpers", () => {
  it("detects EXPIRED_TOKEN client errors", () => {
    expect(
      isExpiredInviteAccessError(
        new ApplicationClientError({
          message: "This invitation link has expired.",
          status: 410,
          code: "EXPIRED_TOKEN",
        }),
      ),
    ).toBe(true);

    expect(
      isExpiredInviteAccessError(
        new ApplicationClientError({
          message: "No valid session was found.",
          status: 401,
          code: "SESSION_REQUIRED",
        }),
      ),
    ).toBe(false);
  });

  it("routes expired access into the read-only apply entry", () => {
    const replace = vi.fn();

    redirectToExpiredInviteReadOnly({ replace });

    expect(replace).toHaveBeenCalledWith(EXPIRED_INVITE_APPLY_PATH);
  });
});
