import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { Button } from "@/components/ui/button";
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
      subtitle="你的申报已关联到此账号，可随时回访继续填写或查询状态。"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">登录邮箱</p>
          <p className="text-muted-foreground text-sm">{session.user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button nativeButton={false} render={<Link href="/apply" />}>
            进入我的申报
          </Button>
          <SignOutButton />
        </div>
      </div>
    </AuthPageShell>
  );
}
