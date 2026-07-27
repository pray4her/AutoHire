import { getRuntimeMode } from "@/lib/env";
import type { InvitationSource } from "@/lib/data/store";
import {
  OPS_EXPORT_DEFAULT_LOOKBACK_DAYS,
} from "@/lib/ops-expert-files/constants";
import {
  shanghaiDayRangeToUtcBounds,
  shanghaiDaysAgoYmd,
  shanghaiTodayYmd,
} from "@/lib/ops-expert-files/time";
import type { z } from "zod";
import type { expertFilesListQuerySchema } from "@/lib/ops-expert-files/schemas";

export type ExpertFilesListQuery = z.infer<typeof expertFilesListQuerySchema>;

export type ExpertFilesListItem = {
  applicationId: string;
  customerNo: string;
  expertId: string;
  screeningPassportFullName: string | null;
  screeningContactEmail: string | null;
  screeningWorkEmail: string | null;
  invitationEmail: string | null;
  invitationSource: InvitationSource;
  referredByExpertName: string | null;
  applicationStatus: string;
  isSubmitted: boolean;
  resumeUploadedAt: string | null;
  submittedAt: string | null;
};

function matchesKeyword(
  item: {
    customerNo: string | null | undefined;
    screeningPassportFullName: string | null;
    screeningContactEmail: string | null;
    screeningWorkEmail: string | null;
    invitationEmail: string | null;
  },
  q: string,
) {
  if (!q) {
    return true;
  }

  const needle = q.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  if (item.customerNo && item.customerNo.toLowerCase() === needle) {
    return true;
  }

  const haystacks = [
    item.screeningPassportFullName,
    item.screeningContactEmail,
    item.screeningWorkEmail,
    item.invitationEmail,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return haystacks.some((value) => value.includes(needle));
}

function resolveDateBounds(input: {
  startDate?: string | null;
  endDate?: string | null;
}) {
  const startDate =
    input.startDate ?? shanghaiDaysAgoYmd(OPS_EXPORT_DEFAULT_LOOKBACK_DAYS);
  const endDate = input.endDate ?? shanghaiTodayYmd();
  return shanghaiDayRangeToUtcBounds({ startDate, endDate });
}

export async function listExpertFiles(
  query: ExpertFilesListQuery,
): Promise<{ items: ExpertFilesListItem[]; total: number; page: number; pageSize: number }> {
  const { start, endExclusive } = resolveDateBounds(query);

  if (getRuntimeMode() === "memory") {
    const storeModule = await import("@/lib/data/store");
    const all = await listMemoryApplications(storeModule);
    const filtered = all
      .filter((app) => Boolean(app.customerNo))
      .filter((app) => {
        if (!app.resumeUploadedAt) {
          return false;
        }
        if (start && app.resumeUploadedAt < start) {
          return false;
        }
        if (endExclusive && app.resumeUploadedAt >= endExclusive) {
          return false;
        }
        if (query.status === "submitted" && app.applicationStatus !== "SUBMITTED") {
          return false;
        }
        if (query.status === "unsubmitted" && app.applicationStatus === "SUBMITTED") {
          return false;
        }
        if (query.source !== "all" && app.invitationSource !== query.source) {
          return false;
        }
        return matchesKeyword(
          {
            customerNo: app.customerNo,
            screeningPassportFullName: app.screeningPassportFullName,
            screeningContactEmail: app.screeningContactEmail,
            screeningWorkEmail: app.screeningWorkEmail,
            invitationEmail: app.invitationEmail,
          },
          query.q,
        );
      })
      .sort(
        (left, right) =>
          (right.resumeUploadedAt?.getTime() ?? 0) -
          (left.resumeUploadedAt?.getTime() ?? 0),
      );

    const total = filtered.length;
    const startIndex = (query.page - 1) * query.pageSize;
    const pageItems = filtered.slice(startIndex, startIndex + query.pageSize);

    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      items: pageItems.map((app) => ({
        applicationId: app.id,
        customerNo: app.customerNo!,
        expertId: app.expertId,
        screeningPassportFullName: app.screeningPassportFullName,
        screeningContactEmail: app.screeningContactEmail,
        screeningWorkEmail: app.screeningWorkEmail,
        invitationEmail: app.invitationEmail,
        invitationSource: app.invitationSource,
        referredByExpertName: resolveMemoryReferrerName(app.referralTokenId),
        applicationStatus: app.applicationStatus,
        isSubmitted: app.applicationStatus === "SUBMITTED",
        resumeUploadedAt: app.resumeUploadedAt?.toISOString() ?? null,
        submittedAt: app.submittedAt?.toISOString() ?? null,
      })),
    };
  }

  const { prisma } = await import("@/lib/db/prisma");
  const where = {
    customerNo: { not: null },
    resumeUploadedAt: {
      ...(start ? { gte: start } : {}),
      ...(endExclusive ? { lt: endExclusive } : {}),
    },
    ...(query.status === "submitted"
      ? { applicationStatus: "SUBMITTED" as const }
      : {}),
    ...(query.status === "unsubmitted"
      ? { applicationStatus: { not: "SUBMITTED" as const } }
      : {}),
    ...(query.source !== "all"
      ? { invitation: { source: query.source } }
      : {}),
    ...(query.q
      ? {
          OR: [
            { customerNo: query.q.trim() },
            {
              screeningPassportFullName: {
                contains: query.q.trim(),
                mode: "insensitive" as const,
              },
            },
            {
              screeningContactEmail: {
                contains: query.q.trim(),
                mode: "insensitive" as const,
              },
            },
            {
              screeningWorkEmail: {
                contains: query.q.trim(),
                mode: "insensitive" as const,
              },
            },
            {
              invitation: {
                email: {
                  contains: query.q.trim(),
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      include: {
        invitation: { select: { email: true, source: true } },
        referralAttribution: {
          select: {
            referrerDisplayName: true,
            referrerEmail: true,
          },
        },
      },
      orderBy: { resumeUploadedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    total,
    page: query.page,
    pageSize: query.pageSize,
    items: rows.map((row) => ({
      applicationId: row.id,
      customerNo: row.customerNo!,
      expertId: row.expertId,
      screeningPassportFullName: row.screeningPassportFullName,
      screeningContactEmail: row.screeningContactEmail,
      screeningWorkEmail: row.screeningWorkEmail,
      invitationEmail: row.invitation.email,
      invitationSource: row.invitation.source,
      referredByExpertName:
        row.referralAttribution?.referrerDisplayName ??
        row.referralAttribution?.referrerEmail ??
        null,
      applicationStatus: row.applicationStatus,
      isSubmitted: row.applicationStatus === "SUBMITTED",
      resumeUploadedAt: row.resumeUploadedAt?.toISOString() ?? null,
      submittedAt: row.submittedAt?.toISOString() ?? null,
    })),
  };
}

type MemoryStoreShape = {
  applications: Array<{
    id: string;
    expertId: string;
    customerNo?: string | null;
    applicationStatus: string;
    screeningPassportFullName: string | null;
    screeningContactEmail: string | null;
    screeningWorkEmail: string | null;
    resumeUploadedAt: Date | null;
    submittedAt: Date | null;
    invitationId: string;
    referralTokenId: string | null;
  }>;
  invitations: Array<{
    id: string;
    email: string | null;
    source: InvitationSource;
  }>;
};

function resolveMemoryReferrerName(
  referralTokenId: string | null | undefined,
): string | null {
  if (!referralTokenId) {
    return null;
  }
  const token = globalThis.__autohireReferralTokenStore?.tokens.find(
    (item) => item.id === referralTokenId,
  );
  if (!token) {
    return null;
  }
  return token.referrerDisplayName ?? token.referrerEmail;
}

function readMemoryStore() {
  return (globalThis as unknown as { __autohireStore?: MemoryStoreShape })
    .__autohireStore;
}

async function listMemoryApplications(storeModule: typeof import("@/lib/data/store")) {
  // Access via known sample IDs + any created at runtime by scanning through getApplicationById is insufficient.
  // Use prisma-less: read global store through a helper we add — fall back to empty if unavailable.
  if (!readMemoryStore()) {
    // Force init by touching a known sample
    await storeModule.getApplicationById("app_intro");
  }

  const store = readMemoryStore();

  if (!store) {
    return [];
  }

  return store.applications.map((app) => ({
    ...app,
    invitationEmail:
      store.invitations.find((item) => item.id === app.invitationId)?.email ??
      null,
    invitationSource:
      store.invitations.find((item) => item.id === app.invitationId)?.source ??
      ("OPS" as const),
  }));
}

export async function resolveExportableApplicationIds(input: {
  mode: "filter" | "ids";
  filter?: {
    q?: string;
    status?: "all" | "submitted" | "unsubmitted";
    startDate?: string | null;
    endDate?: string | null;
  };
  applicationIds?: string[];
}): Promise<{
  candidateIds: string[];
  exportableIds: string[];
  excludedEmptyCount: number;
  estimatedBytes: number;
}> {
  let candidateIds: string[] = [];

  if (input.mode === "ids") {
    candidateIds = [...new Set(input.applicationIds ?? [])];
  } else {
    const listed = await listExpertFiles({
      q: input.filter?.q ?? "",
      status: input.filter?.status ?? "all",
      source: "all",
      startDate: input.filter?.startDate,
      endDate: input.filter?.endDate,
      page: 1,
      pageSize: 100,
    });
    // Cap scan: if total > 100, fetch remaining pages up to a safety cap of 200 for estimate
    candidateIds = listed.items.map((item) => item.applicationId);
    if (listed.total > listed.items.length) {
      const pages = Math.min(Math.ceil(listed.total / 100), 2);
      for (let page = 2; page <= pages; page += 1) {
        const next = await listExpertFiles({
          q: input.filter?.q ?? "",
          status: input.filter?.status ?? "all",
          source: "all",
          startDate: input.filter?.startDate,
          endDate: input.filter?.endDate,
          page,
          pageSize: 100,
        });
        candidateIds.push(...next.items.map((item) => item.applicationId));
      }
    }
  }

  const { loadExpertFileInventory } = await import(
    "@/lib/ops-expert-files/inventory-loader"
  );

  const exportableIds: string[] = [];
  let estimatedBytes = 0;
  let excludedEmptyCount = 0;

  for (const applicationId of candidateIds) {
    const inventory = await loadExpertFileInventory(applicationId);
    if (!inventory || inventory.files.length === 0) {
      excludedEmptyCount += 1;
      continue;
    }
    exportableIds.push(applicationId);
    estimatedBytes += inventory.totalBytes;
  }

  return {
    candidateIds,
    exportableIds,
    excludedEmptyCount,
    estimatedBytes,
  };
}
