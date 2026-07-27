import { redirect } from "next/navigation";
import { connection } from "next/server";

import { AuthPageShell } from "@/features/account-auth/components/auth-page-shell";
import { SignupForm } from "@/features/account-auth/components/signup-form";
import { getAccountSession } from "@/lib/account-auth/session";
import { isReferralPlaintextToken } from "@/lib/referral-tokens/context-cookie";

export const metadata = {
  title: "注册账号",
};

type SignupPageProps = {
  searchParams: Promise<{
    step?: string;
    email?: string;
    referral?: string;
    next?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  await connection();

  const params = await searchParams;
  const session = await getAccountSession();
  if (session) {
    redirect(params.next === "/apply/resume" ? params.next : "/account");
  }

  const initialEmail = typeof params.email === "string" ? params.email : "";
  const initialStep = params.step === "verify" ? "verify" : "credentials";
  const referralPlaintextToken = isReferralPlaintextToken(params.referral)
    ? params.referral
    : undefined;

  return (
    <AuthPageShell
      title="注册账号"
      subtitle="使用邮箱注册，验证成功后自动登录。"
      cardTitle="注册"
      cardDescription="填写邮箱与密码，我们会向你的邮箱发送 6 位验证码。"
    >
      <SignupForm
        initialEmail={initialEmail}
        initialStep={initialStep}
        referralPlaintextToken={referralPlaintextToken}
        nextPath={params.next === "/apply/resume" ? params.next : undefined}
      />
    </AuthPageShell>
  );
}
