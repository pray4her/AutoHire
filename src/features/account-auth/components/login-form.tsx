"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/account-auth/client";

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) {
        if (error.code === "EMAIL_NOT_VERIFIED" || error.status === 403) {
          // Email not verified yet: send a fresh code and continue on the
          // sign-up page, where entering it completes verification.
          await authClient.emailOtp.sendVerificationOtp({
            email,
            type: "sign-in",
          });
          toast.success(
            "Your email is not verified yet — we sent you a new code.",
          );
          const next = nextPath ? `&next=${encodeURIComponent(nextPath)}` : "";
          router.push(`/signup?email=${encodeURIComponent(email)}${next}`);
          return;
        }
        throw new Error(
          error.code === "INVALID_EMAIL_OR_PASSWORD"
            ? "Incorrect email or password."
            : (error.message ?? "Sign-in failed."),
        );
      }
      toast.success("Signed in successfully.");
      router.replace((nextPath ?? "/account") as "/apply/resume" | "/account");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value.trim())}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="login-password">Password</FieldLabel>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Spinner data-icon="inline-start" /> : null}
          Sign In
        </Button>
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-primary underline">
            Forgot password?
          </Link>
          <Link
            href={
              nextPath
                ? `/signup?next=${encodeURIComponent(nextPath)}`
                : "/signup"
            }
            className="text-primary underline"
          >
            Create account
          </Link>
        </div>
      </FieldGroup>
    </form>
  );
}
