import { redirect } from "next/navigation";
import { connection } from "next/server";

import { AuthPageShell } from "@/features/account-auth/components/auth-page-shell";
import { LoginForm } from "@/features/account-auth/components/login-form";
import { getAccountSession } from "@/lib/account-auth/session";

export const metadata = {
  title: "登录",
};

export default async function LoginPage() {
  await connection();

  const session = await getAccountSession();
  if (session) {
    redirect("/account");
  }

  return (
    <AuthPageShell
      title="登录"
      subtitle="使用注册邮箱与密码登录，回访你的申报。"
      cardTitle="账号登录"
    >
      <LoginForm />
    </AuthPageShell>
  );
}
