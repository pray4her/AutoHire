import { z } from "zod";

export const expertFilesListQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  status: z.enum(["all", "submitted", "unsubmitted"]).default("all"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const exportFilterSchema = z.object({
  q: z.string().trim().optional().default(""),
  status: z.enum(["all", "submitted", "unsubmitted"]).default("all"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export const exportEstimateRequestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("filter"),
    filter: exportFilterSchema,
  }),
  z.object({
    mode: z.literal("ids"),
    applicationIds: z.array(z.string().min(1)).min(1).max(50),
  }),
]);

export const exportCreateRequestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("filter"),
    filter: exportFilterSchema,
    estimateToken: z.string().min(1),
  }),
  z.object({
    mode: z.literal("ids"),
    applicationIds: z.array(z.string().min(1)).min(1).max(50),
    estimateToken: z.string().min(1),
  }),
]);

export const exportCallbackSchema = z.object({
  status: z.enum(["SUCCEEDED", "SUCCEEDED_WITH_GAPS", "FAILED"]),
  outputObjectKey: z.string().optional(),
  zipFileSize: z.number().int().nonnegative().optional(),
  missingCount: z.number().int().nonnegative().optional().default(0),
  missingSummary: z.unknown().optional(),
  errorMessage: z.string().optional(),
});
