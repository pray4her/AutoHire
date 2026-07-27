import { z } from "zod";

import type {
  GeneratedReferralToken,
  ReferralExpertOption,
  ReferralTokenMetadata,
} from "@/features/referral-tokens/types";
import { referralDisplayFieldSchema } from "@/lib/referral-tokens/schemas";

const referralTokenMetadataSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  expertId: z.string(),
  displayFields: z.array(referralDisplayFieldSchema),
  status: z.enum(["ACTIVE", "EXPIRED", "DISABLED"]),
  expiredAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  funnel: z
    .object({
      clickCount: z.number().int().nonnegative(),
      registrationCount: z.number().int().nonnegative(),
      applicationCount: z.number().int().nonnegative(),
    })
    .optional(),
});

const tokenResponseSchema = z.object({
  token: referralTokenMetadataSchema.nullable(),
});

const generatedTokenResponseSchema = z.object({
  token: referralTokenMetadataSchema,
  plaintextToken: z.string().regex(/^[0-9a-f]{64}$/),
  referralLink: z.url(),
});

const expertSearchResponseSchema = z.object({
  items: z.array(
    z.object({
      applicationId: z.string(),
      expertId: z.string(),
      customerNo: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
    }),
  ),
});

export class ReferralTokenClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ReferralTokenClientError";
    this.status = status;
  }
}

async function readJson(response: Response): Promise<unknown> {
  const payload = await response.json();
  if (!response.ok) {
    const parsed = z.object({ error: z.string() }).safeParse(payload);
    throw new ReferralTokenClientError(
      parsed.success ? parsed.data.error : "推荐 token 操作失败。",
      response.status,
    );
  }
  return payload;
}

export async function loadReferralToken(
  applicationId: string,
  signal?: AbortSignal,
): Promise<ReferralTokenMetadata | null> {
  const response = await fetch(`/api/ops/referral-tokens/${applicationId}`, {
    credentials: "include",
    signal,
  });
  return tokenResponseSchema.parse(await readJson(response)).token;
}

export async function searchReferralExperts(
  query: string,
): Promise<readonly ReferralExpertOption[]> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/ops/referral-tokens/experts?${params}`, {
    credentials: "include",
  });
  const payload = expertSearchResponseSchema.parse(await readJson(response));
  return payload.items.map((expert) => ({
    applicationId: expert.applicationId,
    expertId: expert.expertId,
    customerNo: expert.customerNo,
    name: expert.name,
    email: expert.email,
  }));
}

export async function createReferralToken(
  applicationId: string,
  displayFields: ReferralTokenMetadata["displayFields"],
): Promise<GeneratedReferralToken> {
  const response = await fetch(`/api/ops/referral-tokens/${applicationId}`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ displayFields }),
  });
  return generatedTokenResponseSchema.parse(await readJson(response));
}

export async function changeReferralToken(
  applicationId: string,
  action: "DISABLE" | "RENEW",
): Promise<ReferralTokenMetadata> {
  const response = await fetch(`/api/ops/referral-tokens/${applicationId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const token = tokenResponseSchema.parse(await readJson(response)).token;
  if (!token) {
    throw new ReferralTokenClientError("推荐 token 操作未返回结果。", 500);
  }
  return token;
}

export async function regenerateReferralToken(
  applicationId: string,
  displayFields: ReferralTokenMetadata["displayFields"],
): Promise<GeneratedReferralToken> {
  const response = await fetch(`/api/ops/referral-tokens/${applicationId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "REGENERATE", displayFields }),
  });
  return generatedTokenResponseSchema.parse(await readJson(response));
}
