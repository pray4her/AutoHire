import { redirect } from "next/navigation";
import { connection } from "next/server";

import { AuthPageShell } from "@/features/account-auth/components/auth-page-shell";
import { SignupForm } from "@/features/account-auth/components/signup-form";
import { getAccountSession } from "@/lib/account-auth/session";
import { isReferralPlaintextToken } from "@/lib/referral-tokens/context-cookie";

export const metadata = {
  title: "Create Account",
};

type SignupPageProps = {
  searchParams: Promise<{
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
  const referralPlaintextToken = isReferralPlaintextToken(params.referral)
    ? params.referral
    : undefined;

  return (
    <AuthPageShell
      title="Create your account"
      subtitle="Verify your email once — you're signed in right after."
    >
      <SignupForm
        initialEmail={initialEmail}
        referralPlaintextToken={referralPlaintextToken}
        nextPath={params.next === "/apply/resume" ? params.next : undefined}
      />
    </AuthPageShell>
  );
}
