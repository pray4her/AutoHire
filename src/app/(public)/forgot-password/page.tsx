import { connection } from "next/server";

import { AuthPageShell } from "@/features/account-auth/components/auth-page-shell";
import { ForgotPasswordForm } from "@/features/account-auth/components/forgot-password-form";

export const metadata = {
  title: "Forgot Password",
};

export default async function ForgotPasswordPage() {
  await connection();

  return (
    <AuthPageShell
      title="Forgot password"
      subtitle="Enter your account email and we'll send you a reset code."
    >
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
