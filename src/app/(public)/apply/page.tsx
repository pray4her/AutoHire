import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  PageFrame,
  PageShell,
  StatusBanner,
} from "@/components/ui/page-shell";
import { ApplyEntryClient } from "@/features/application/components/apply-entry-client";
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
import { getSessionCookieName } from "@/lib/auth/session";

type ApplyEntryPageProps = {
  searchParams: Promise<Record<string, NextSearchParamValue>>;
};

const ACCESS_ERROR_COPY: Record<
  ApplyEntryAccessErrorCode,
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
  EXPIRED_TOKEN: {
    title: "Invitation expired",
    description:
      "This invitation link has expired. Please contact the program team for a new invitation.",
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

function ApplyEntryAccessError({
  code,
}: {
  code: ApplyEntryAccessErrorCode;
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
        </div>
      </PageShell>
    </PageFrame>
  );
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
  const accessError =
    accessErrorParam && accessErrorParam in ACCESS_ERROR_COPY
      ? (accessErrorParam as ApplyEntryAccessErrorCode)
      : null;

  if (accessError) {
    return <ApplyEntryAccessError code={accessError} />;
  }

  const cookieStore = await cookies();
  const access = await resolveApplyEntryAccessFromSessionCookie(
    cookieStore.get(getSessionCookieName())?.value,
  );

  if (access.kind === "rejected") {
    return <ApplyEntryAccessError code={access.code} />;
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
