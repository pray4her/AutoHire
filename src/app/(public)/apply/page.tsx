import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  PageFrame,
  PageShell,
  StatusBanner,
} from "@/components/ui/page-shell";
import { ApplyEntryClient } from "@/features/application/components/apply-entry-client";
import { ApplyExpiredReadOnlyEntry } from "@/features/application/components/apply-expired-read-only-entry";
import { EXPIRED_INVITE_APPLY_PATH } from "@/features/application/expired-invite-access";
import {
  resolveInviteTokenFromNextSearchParams,
  type NextSearchParamValue,
} from "@/features/application/invite-url-token";
import {
  resolveApplyEntryAccessFromSessionCookie,
  type ApplyEntryAccessErrorCode,
} from "@/features/application/server/apply-entry-access";
import {
  resolveRouteFromStatus,
  shouldRedirectFromApply,
} from "@/features/application/route";
import { getAccountSessionFromHeaders } from "@/lib/account-auth/request-session";
import { getSessionCookieName } from "@/lib/auth/session";

type ApplyEntryPageProps = {
  searchParams: Promise<Record<string, NextSearchParamValue>>;
};

type ApplyEntryBannerErrorCode = Exclude<
  ApplyEntryAccessErrorCode,
  "EXPIRED_TOKEN"
>;

const ACCESS_ERROR_COPY: Record<
  ApplyEntryBannerErrorCode,
  {
    readonly title: string;
    readonly description: string;
  }
> = {
  APPLICATION_NOT_FOUND: {
    title: "Application not found",
    description:
      "We could not find the application linked to this session. Please reopen the original invitation email and try again.",
  },
  DISABLED_TOKEN: {
    title: "Invitation unavailable",
    description:
      "This invitation link has been disabled. Please contact the program team if you still need access.",
  },
  INVALID_TOKEN: {
    title: "Invitation link invalid",
    description:
      "The invitation link could not be verified. Please reopen the original email and use the complete link.",
  },
  SESSION_INIT_FAILED: {
    title: "Session unavailable",
    description:
      "We could not start your application session just now. Please refresh the page or reopen the original invitation link.",
  },
  SESSION_REQUIRED: {
    title: "Invitation required",
    description:
      "Open the application from your original invitation email so we can verify access before showing the application entry.",
  },
};

function pickSearchParamValue(value: NextSearchParamValue) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

function buildExpertSessionRedirectUrl(token: string) {
  const params = new URLSearchParams({
    token,
    redirectTo: "/apply?invite=1",
  });

  return `/api/expert-session?${params.toString()}` as const;
}

function buildAccountBootstrapRedirectUrl() {
  const params = new URLSearchParams({
    account: "1",
    redirectTo: "/apply?invite=1",
  });

  return `/api/expert-session?${params.toString()}` as const;
}

function ApplyEntryAccessError({
  code,
}: {
  code: ApplyEntryBannerErrorCode;
}) {
  const copy = ACCESS_ERROR_COPY[code];

  return (
    <PageFrame>
      <PageShell
        title="Global Excellent Scientists Fund"
        description="Invitation verification is required before the application entry can be displayed."
        headerTitleClassName="font-normal"
        headerVariant="centered"
      >
        <div className="mx-auto max-w-2xl">
          <StatusBanner
            tone="danger"
            title={copy.title}
            description={copy.description}
          />
          {code === "SESSION_REQUIRED" ? (
            <div className="mt-6 flex justify-center">
              <Button nativeButton={false} render={<Link href="/login" />}>
                Sign in to continue your application
              </Button>
            </div>
          ) : null}
        </div>
      </PageShell>
    </PageFrame>
  );
}

function isBannerAccessErrorCode(
  value: string,
): value is ApplyEntryBannerErrorCode {
  return value in ACCESS_ERROR_COPY;
}

export default async function ApplyEntryPage({
  searchParams,
}: ApplyEntryPageProps) {
  const resolvedSearchParams = await searchParams;
  const token = resolveInviteTokenFromNextSearchParams(resolvedSearchParams);
  const openedFromInviteLink =
    pickSearchParamValue(resolvedSearchParams.invite) === "1";

  if (token) {
    redirect(buildExpertSessionRedirectUrl(token));
  }

  const accessErrorParam = pickSearchParamValue(
    resolvedSearchParams.accessError,
  );

  if (accessErrorParam === "EXPIRED_TOKEN") {
    return <ApplyExpiredReadOnlyEntry />;
  }

  if (accessErrorParam && isBannerAccessErrorCode(accessErrorParam)) {
    return <ApplyEntryAccessError code={accessErrorParam} />;
  }

  const cookieStore = await cookies();
  const access = await resolveApplyEntryAccessFromSessionCookie(
    cookieStore.get(getSessionCookieName())?.value,
  );

  if (access.kind === "rejected") {
    if (access.code === "EXPIRED_TOKEN") {
      redirect(EXPIRED_INVITE_APPLY_PATH);
    }

    if (access.code === "SESSION_REQUIRED") {
      // Account track: a signed-in account converges onto its shadow
      // invitation's application through the bootstrap route (which sets the
      // application session cookie). Everyone else keeps the link-track
      // guidance banner, now with a login entry point.
      const accountIdentity = await getAccountSessionFromHeaders(
        await headers(),
      );

      if (accountIdentity) {
        redirect(buildAccountBootstrapRedirectUrl());
      }
    }

    if (isBannerAccessErrorCode(access.code)) {
      return <ApplyEntryAccessError code={access.code} />;
    }

    return <ApplyEntryAccessError code="SESSION_REQUIRED" />;
  }

  if (openedFromInviteLink && shouldRedirectFromApply(access.snapshot)) {
    redirect(resolveRouteFromStatus(access.snapshot.applicationStatus));
  }

  return (
    <ApplyEntryClient
      initialSnapshot={access.snapshot}
      openedFromInviteLink={openedFromInviteLink}
    />
  );
}
