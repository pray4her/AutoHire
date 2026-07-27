import { connection } from "next/server";

import { AuthPageShell } from "@/features/account-auth/components/auth-page-shell";
import { ResetPasswordForm } from "@/features/account-auth/components/reset-password-form";

export const metadata = {
  title: "重置密码",
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
      title="重置密码"
      subtitle="输入邮箱收到的验证码并设置新密码。"
      cardTitle="设置新密码"
    >
      <ResetPasswordForm initialEmail={initialEmail} />
    </AuthPageShell>
  );
}
