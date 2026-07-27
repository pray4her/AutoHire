import { connection } from "next/server";

import { AuthPageShell } from "@/features/account-auth/components/auth-page-shell";
import { ForgotPasswordForm } from "@/features/account-auth/components/forgot-password-form";

export const metadata = {
  title: "忘记密码",
};

export default async function ForgotPasswordPage() {
  await connection();

  return (
    <AuthPageShell
      title="忘记密码"
      subtitle="输入注册邮箱，我们会发送重置验证码。"
      cardTitle="找回密码"
    >
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
