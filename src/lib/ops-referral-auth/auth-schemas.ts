import { z } from "zod";

export const opsReferralLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const opsReferralChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
