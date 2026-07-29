import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { ExpertFilesLoginForm } from "@/features/ops-expert-files/components/expert-files-login-form";
import { verifyOpsReferralSession } from "@/lib/ops-referral-auth/account-auth";
import { getOpsReferralCookieName } from "@/lib/ops-referral-auth/session";

export default async function ReferralsLoginPage() {
  await connection();

  const cookieStore = await cookies();
  const session = await verifyOpsReferralSession(
    cookieStore.get(getOpsReferralCookieName())?.value,
  );

  if (session) {
    redirect("/ops/referrals");
  }

  return (
    <ExpertFilesLoginForm
      redirectTo="/ops/referrals"
      loginPath="/api/ops/referral-auth/login"
      title="推荐链接登录"
      subtitle="使用推荐运营账号与密码进入推荐链接生成页。"
      description="此账号与专家档案、邀请生成页相互独立。"
    />
  );
}
