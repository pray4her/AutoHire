import { connection } from "next/server";

import { AuthPageShell } from "@/features/account-auth/components/auth-page-shell";
import { ResetPasswordForm } from "@/features/account-auth/components/reset-password-form";

export const metadata = {
  title: "Reset Password",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  await connection();

  const params = await searchParams;
  const initialEmail = typeof params.email === "string" ? params.email : "";

  return (
    <AuthPageShell
      title="Reset password"
      subtitle="Enter the code from your email and choose a new password."
    >
      <ResetPasswordForm initialEmail={initialEmail} />
    </AuthPageShell>
  );
}
