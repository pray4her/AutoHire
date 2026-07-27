import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { Button } from "@/components/ui/button";
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
      cardDescription="你的申报已关联到此账号，可随时回访继续填写或查询状态。"
    >
      <Card className="border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-base">登录邮箱</CardTitle>
          <CardDescription>{session.user.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3 px-0 pb-0">
          <Button nativeButton={false} render={<Link href="/apply" />}>
            进入我的申报
          </Button>
          <SignOutButton />
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
