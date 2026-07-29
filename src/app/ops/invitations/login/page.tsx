import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { ExpertFilesLoginForm } from "@/features/ops-expert-files/components/expert-files-login-form";
import { verifyOpsExpertFilesSession } from "@/lib/ops-expert-files/account-auth";
import { getOpsExpertFilesCookieName } from "@/lib/ops-expert-files/session";

export default async function InvitationsLoginPage() {
  await connection();

  const cookieStore = await cookies();
  const session = await verifyOpsExpertFilesSession(
    cookieStore.get(getOpsExpertFilesCookieName())?.value,
  );

  if (session) {
    redirect("/ops/invitations");
  }

  return (
    <ExpertFilesLoginForm
      redirectTo="/ops/invitations"
      title="邀请链接登录"
        subtitle="使用运营账号与密码进入邀请链接生成页。"
        description="与专家档案共用同一运营账号；与推荐链接页账号相互独立。"
    />
  );
}
