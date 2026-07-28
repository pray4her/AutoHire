"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/account-auth/client";
import { otpErrorMessage } from "@/features/account-auth/error-messages";

type ResetPasswordFormProps = {
  initialEmail?: string;
};

export function ResetPasswordForm({
  initialEmail = "",
}: ResetPasswordFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await authClient.emailOtp.resetPassword({
        email,
        otp,
        password,
      });
      if (error) {
        throw new Error(otpErrorMessage(error, "Reset failed."));
      }
      toast.success("Password reset. Sign in with your new password.");
      router.replace("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reset failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="reset-email">Email</FieldLabel>
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value.trim())}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="reset-otp">Verification Code</FieldLabel>
          <Input
            id="reset-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value.trim())}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="reset-password">New Password</FieldLabel>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <FieldDescription>At least 8 characters.</FieldDescription>
        </Field>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Spinner data-icon="inline-start" /> : null}
          Reset Password
        </Button>
        <p className="text-muted-foreground text-center text-sm">
          Remembered it?{" "}
          <Link href="/login" className="text-primary underline">
            Back to sign in
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
