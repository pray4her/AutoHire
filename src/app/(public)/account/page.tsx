import { redirect } from "next/navigation";
import { connection } from "next/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthPageShell } from "@/features/account-auth/components/auth-page-shell";
import { SignOutButton } from "@/features/account-auth/components/sign-out-button";
import { getAccountSession } from "@/lib/account-auth/session";

export const metadata = {
  title: "我的账号",
};

export default async function AccountPage() {
  await connection();

  const session = await getAccountSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <AuthPageShell
      title="我的账号"
      subtitle="你已登录账号轨。"
      cardTitle="账号信息"
      cardDescription="申报上下文（影子邀请与申报）将在后续版本自动关联到此账号。"
    >
      <Card className="border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-base">登录邮箱</CardTitle>
          <CardDescription>{session.user.email}</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <SignOutButton />
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
