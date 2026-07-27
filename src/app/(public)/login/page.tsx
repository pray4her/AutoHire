import { redirect } from "next/navigation";
import { connection } from "next/server";

import { AuthPageShell } from "@/features/account-auth/components/auth-page-shell";
import { LoginForm } from "@/features/account-auth/components/login-form";
import { getAccountSession } from "@/lib/account-auth/session";

export const metadata = {
  title: "Sign In",
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
      title="Welcome back"
      subtitle="Sign in with your registered email and password to return to your application."
      cardTitle="Sign In"
    >
      <LoginForm nextPath={nextPath} />
    </AuthPageShell>
  );
}
