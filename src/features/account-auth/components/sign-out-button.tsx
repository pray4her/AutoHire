"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/account-auth/client";

export function SignOutButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onSignOut() {
    setSubmitting(true);
    try {
      await authClient.signOut();
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Sign-out failed. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={submitting}
      onClick={onSignOut}
    >
      {submitting ? <Spinner data-icon="inline-start" /> : null}
      Sign Out
    </Button>
  );
}
