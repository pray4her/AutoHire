import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { Button } from "@/components/ui/button";
import { AuthPageShell } from "@/features/account-auth/components/auth-page-shell";
import { SignOutButton } from "@/features/account-auth/components/sign-out-button";
import { getAccountSession } from "@/lib/account-auth/session";

export const metadata = {
  title: "My Account",
};

export default async function AccountPage() {
  await connection();

  const session = await getAccountSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <AuthPageShell
      title="My Account"
      subtitle="Your application is linked to this account — return anytime to continue or check its status."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Signed in as</p>
          <p className="text-muted-foreground text-sm">{session.user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button nativeButton={false} render={<Link href="/apply" />}>
            Go to My Application
          </Button>
          <SignOutButton />
        </div>
      </div>
    </AuthPageShell>
  );
}
