import { z } from "zod";

export const referralTokenEntrySchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  displayName: z.string().trim().min(1).max(120).optional(),
});

export const referralTokenBatchGenerateSchema = z.object({
  entries: z.array(referralTokenEntrySchema).min(1).max(500),
});

export const publicReferralTokenSchema = z
  .string()
  .regex(/^[0-9a-f]{64}$/, "推荐 token 格式无效。");

export const publicReferralQuerySchema = z.object({
  t: publicReferralTokenSchema,
});

export const referralTokenActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("DISABLE") }),
  z.object({ action: z.literal("RENEW") }),
  z.object({ action: z.literal("REGENERATE") }),
]);
