import { randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import { z } from "zod";

import {
  generateInvitePlaintextToken,
  hashInviteToken,
  INVITE_HASH_ALGORITHMS,
} from "@/lib/auth/token";
import {
  createInvitationGenerationBatch,
  findInvitationGenerationBatchById,
  findInvitationGenerationBatchByIdempotencyKey,
  listInvitationGenerationBatches as listInvitationGenerationBatchesFromStore,
  type InvitationGenerationBatchWithItems,
} from "@/lib/data/store";
import { getEnv } from "@/lib/env";
import {
  INVITATION_GENERATION_BATCH_LIST_LIMIT,
  INVITATION_GENERATION_DEFAULT_EXPIRED_DAYS,
  INVITATION_GENERATION_MAX_COUNT,
  INVITATION_GENERATION_MAX_EXPIRED_DAYS,
  INVITATION_GENERATION_MAX_EXPIRED_HOURS,
  INVITATION_GENERATION_MAX_EXPIRED_MINUTES,
  INVITATION_GENERATION_PREVIEW_LIMIT,
} from "@/lib/invitations/constants";
import { formatInvitationDateTime } from "@/lib/invitations/date-format";
import type {
  InvitationGenerationBatchListItem,
  InvitationGenerationBatchSummary,
} from "@/lib/invitations/types";

export { formatInvitationExpiryLabel } from "@/lib/invitations/expiry-label";
export {
  INVITATION_GENERATION_BATCH_LIST_LIMIT,
  INVITATION_GENERATION_DEFAULT_COUNT,
  INVITATION_GENERATION_DEFAULT_EXPIRED_DAYS,
  INVITATION_GENERATION_MAX_COUNT,
  INVITATION_GENERATION_MAX_EXPIRED_DAYS,
  INVITATION_GENERATION_MAX_EXPIRED_HOURS,
  INVITATION_GENERATION_MAX_EXPIRED_MINUTES,
  INVITATION_GENERATION_PREVIEW_LIMIT,
  INVITATION_GENERATION_SOFT_CONFIRM_COUNT,
} from "@/lib/invitations/constants";
export type {
  InvitationGenerationBatchListItem,
  InvitationGenerationBatchSummary,
  InvitationGenerationItemSummary,
} from "@/lib/invitations/types";

export const invitationGenerationRequestSchema = z
  .object({
    algorithm: z.enum(INVITE_HASH_ALGORITHMS),
    count: z.coerce.number().int().min(1).max(INVITATION_GENERATION_MAX_COUNT),
    idempotencyKey: z.string().trim().min(8).max(120),
    expiredDays: z.coerce
      .number()
      .int()
      .min(0)
      .max(INVITATION_GENERATION_MAX_EXPIRED_DAYS)
      .default(INVITATION_GENERATION_DEFAULT_EXPIRED_DAYS),
    expiredHours: z.coerce
      .number()
      .int()
      .min(0)
      .max(INVITATION_GENERATION_MAX_EXPIRED_HOURS)
      .default(0),
    expiredMinutes: z.coerce
      .number()
      .int()
      .min(0)
      .max(INVITATION_GENERATION_MAX_EXPIRED_MINUTES)
      .default(0),
  })
  .superRefine((value, ctx) => {
    if (value.expiredDays > 0) {
      if (value.expiredHours !== 0 || value.expiredMinutes !== 0) {
        ctx.addIssue({
          code: "custom",
          message:
            "Hours and minutes must be 0 when expiry days is greater than 0.",
          path: ["expiredHours"],
        });
      }
      return;
    }

    if (value.expiredHours === 0 && value.expiredMinutes === 0) {
      ctx.addIssue({
        code: "custom",
        message:
          "When expiry days is 0, set at least 1 minute via hours or minutes.",
        path: ["expiredMinutes"],
      });
    }
  });

export type InvitationGenerationRequest = z.infer<
  typeof invitationGenerationRequestSchema
>;

export class InvitationGenerationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvitationGenerationConflictError";
  }
}

function addExpiryDuration(
  date: Date,
  input: {
    readonly expiredDays: number;
    readonly expiredHours: number;
    readonly expiredMinutes: number;
  },
) {
  const ms =
    input.expiredDays * 24 * 60 * 60 * 1000 +
    input.expiredHours * 60 * 60 * 1000 +
    input.expiredMinutes * 60 * 1000;

  return new Date(date.getTime() + ms);
}

function createBatchId() {
  return `invite_batch_${randomUUID().replaceAll("-", "")}`;
}

function getInviteBaseUrl() {
  return getEnv().APP_BASE_URL.replace(/\/$/, "");
}

function buildInviteLink(token: string) {
  return `${getInviteBaseUrl()}/apply?t=${encodeURIComponent(token)}`;
}

function toBatchSummary(
  batch: InvitationGenerationBatchWithItems,
  options?: { readonly itemLimit?: number },
): InvitationGenerationBatchSummary {
  const items =
    options?.itemLimit != null
      ? batch.items.slice(0, options.itemLimit)
      : batch.items;

  return {
    id: batch.id,
    idempotencyKey: batch.idempotencyKey,
    hashAlgorithm: batch.hashAlgorithm,
    requestedCount: batch.requestedCount,
    createdCount: batch.createdCount,
    expiredDays: batch.expiredDays,
    expiredHours: batch.expiredHours,
    expiredMinutes: batch.expiredMinutes,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
    items: items.map((item, index) => ({
      sequence: index + 1,
      invitationId: item.invitationId,
      expertId: item.expertId,
      plaintextToken: item.plaintextToken,
      tokenHash: item.tokenHash,
      inviteLink: item.inviteLink,
      hashAlgorithm: batch.hashAlgorithm,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export async function getInvitationGenerationBatchSummary(batchId: string) {
  const batch = await findInvitationGenerationBatchById(batchId);

  return batch ? toBatchSummary(batch) : null;
}

export async function listInvitationGenerationBatches(
  take = INVITATION_GENERATION_BATCH_LIST_LIMIT,
): Promise<readonly InvitationGenerationBatchListItem[]> {
  const batches = await listInvitationGenerationBatchesFromStore({ take });

  return batches.map((batch) => ({
    id: batch.id,
    hashAlgorithm: batch.hashAlgorithm,
    requestedCount: batch.requestedCount,
    createdCount: batch.createdCount,
    expiredDays: batch.expiredDays,
    expiredHours: batch.expiredHours,
    expiredMinutes: batch.expiredMinutes,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  }));
}

export async function generateInvitationBatch(
  input: InvitationGenerationRequest,
): Promise<InvitationGenerationBatchSummary> {
  const existing = await findInvitationGenerationBatchByIdempotencyKey(
    input.idempotencyKey,
    { itemsTake: INVITATION_GENERATION_PREVIEW_LIMIT },
  );

  if (existing) {
    if (
      existing.hashAlgorithm !== input.algorithm ||
      existing.requestedCount !== input.count ||
      existing.expiredDays !== input.expiredDays ||
      existing.expiredHours !== input.expiredHours ||
      existing.expiredMinutes !== input.expiredMinutes
    ) {
      throw new InvitationGenerationConflictError(
        "The idempotency key was already used with different generation settings.",
      );
    }

    return toBatchSummary(existing, {
      itemLimit: INVITATION_GENERATION_PREVIEW_LIMIT,
    });
  }

  const batchId = createBatchId();
  const now = new Date();
  const expiredAt = addExpiryDuration(now, input);
  const invitations = Array.from({ length: input.count }, (_, index) => {
    const plaintextToken = generateInvitePlaintextToken();

    return {
      expertId: `generated_${batchId}_${index + 1}`,
      plaintextToken,
      tokenHash: hashInviteToken(plaintextToken, input.algorithm),
      inviteLink: buildInviteLink(plaintextToken),
      expiredAt,
    };
  });

  const batch = await createInvitationGenerationBatch({
    id: batchId,
    idempotencyKey: input.idempotencyKey,
    hashAlgorithm: input.algorithm,
    requestedCount: input.count,
    expiredDays: input.expiredDays,
    expiredHours: input.expiredHours,
    expiredMinutes: input.expiredMinutes,
    invitations,
    itemsTake: INVITATION_GENERATION_PREVIEW_LIMIT,
  });

  return toBatchSummary(batch, {
    itemLimit: INVITATION_GENERATION_PREVIEW_LIMIT,
  });
}

export function buildInvitationGenerationWorkbook(
  batch: InvitationGenerationBatchSummary,
) {
  const expiredAt = formatInvitationDateTime(
    addExpiryDuration(new Date(batch.createdAt), {
      expiredDays: batch.expiredDays,
      expiredHours: batch.expiredHours,
      expiredMinutes: batch.expiredMinutes,
    }),
  );

  const opsRows = batch.items.map((item) => ({
    序号: item.sequence,
    邀请链接: item.inviteLink,
    失效时间: expiredAt,
  }));
  const techRows = batch.items.map((item) => ({
    序号: item.sequence,
    "邀请 ID": item.invitationId,
    "专家 ID": item.expertId,
    原始令牌: item.plaintextToken,
    邀请链接: item.inviteLink,
    哈希算法: item.hashAlgorithm,
    失效时间: expiredAt,
    创建时间: formatInvitationDateTime(item.createdAt),
  }));

  const opsSheet = XLSX.utils.json_to_sheet(opsRows, {
    header: ["序号", "邀请链接", "失效时间"],
  });
  const techSheet = XLSX.utils.json_to_sheet(techRows, {
    header: [
      "序号",
      "邀请 ID",
      "专家 ID",
      "原始令牌",
      "邀请链接",
      "哈希算法",
      "失效时间",
      "创建时间",
    ],
  });
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, opsSheet, "邀请链接");
  XLSX.utils.book_append_sheet(workbook, techSheet, "技术明细");

  const workbookBuffer: Buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });

  return workbookBuffer;
}
