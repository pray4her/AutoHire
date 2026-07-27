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
        throw new Error(otpErrorMessage(error, "重置失败。"));
      }
      toast.success("密码已重置，请使用新密码登录。");
      router.replace("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "重置失败。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="reset-email">邮箱</FieldLabel>
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
          <FieldLabel htmlFor="reset-otp">邮箱验证码</FieldLabel>
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
          <FieldLabel htmlFor="reset-password">新密码</FieldLabel>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <p className="text-muted-foreground text-xs">至少 8 个字符。</p>
        </Field>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Spinner data-icon="inline-start" /> : null}
          重置密码
        </Button>
        <p className="text-muted-foreground text-center text-sm">
          想起来了？{" "}
          <Link href="/login" className="text-primary underline">
            返回登录
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
