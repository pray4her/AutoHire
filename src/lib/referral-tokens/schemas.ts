import { z } from "zod";

export const REFERRAL_DISPLAY_FIELDS = [
  "NAME",
  "TITLE",
  "ORGANIZATION",
  "EMAIL",
  "PHONE",
] as const;

export const referralDisplayFieldSchema = z.enum(REFERRAL_DISPLAY_FIELDS);
export const referralDisplayFieldsSchema = z.array(referralDisplayFieldSchema);

const referralDisplayFieldSelectionSchema = z
  .array(referralDisplayFieldSchema)
  .min(1)
  .max(REFERRAL_DISPLAY_FIELDS.length)
  .refine((fields) => fields.includes("NAME"), {
    message: "必须公开专家姓名。",
  })
  .refine((fields) => new Set(fields).size === fields.length, {
    message: "展示字段不能重复。",
  });

export const referralTokenCreateSchema = z.object({
  displayFields: referralDisplayFieldSelectionSchema,
});

export const referralTokenActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("DISABLE") }),
  z.object({ action: z.literal("RENEW") }),
  z.object({
    action: z.literal("REGENERATE"),
    displayFields: referralDisplayFieldSelectionSchema,
  }),
]);

export type ReferralDisplayField = z.infer<typeof referralDisplayFieldSchema>;
