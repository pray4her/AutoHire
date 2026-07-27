import { redirect } from "next/navigation";
import { connection } from "next/server";

import { AuthPageShell } from "@/features/account-auth/components/auth-page-shell";
import { LoginForm } from "@/features/account-auth/components/login-form";
import { getAccountSession } from "@/lib/account-auth/session";

export const metadata = {
  title: "登录",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await connection();

  const params = await searchParams;
  const nextPath = params.next === "/apply/resume" ? params.next : undefined;
  const session = await getAccountSession();
  if (session) {
    redirect(nextPath ?? "/account");
  }

  return (
    <AuthPageShell
      title="登录"
      subtitle="使用注册邮箱与密码登录，回访你的申报。"
      cardTitle="账号登录"
    >
      <LoginForm nextPath={nextPath} />
    </AuthPageShell>
  );
}
