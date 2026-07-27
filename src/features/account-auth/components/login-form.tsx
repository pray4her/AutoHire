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

export function LoginForm() {
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
          // Email not verified yet: resend the code and continue at signup.
          await authClient.emailOtp.sendVerificationOtp({
            email,
            type: "email-verification",
          });
          toast.success("邮箱尚未验证，验证码已重新发送。");
          router.push(`/signup?step=verify&email=${encodeURIComponent(email)}`);
          return;
        }
        throw new Error(
          error.code === "INVALID_EMAIL_OR_PASSWORD"
            ? "邮箱或密码不正确。"
            : (error.message ?? "登录失败。"),
        );
      }
      toast.success("登录成功。");
      router.replace("/account");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登录失败。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="login-email">邮箱</FieldLabel>
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
          <FieldLabel htmlFor="login-password">密码</FieldLabel>
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
          登录
        </Button>
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-primary underline">
            忘记密码
          </Link>
          <Link href="/signup" className="text-primary underline">
            注册账号
          </Link>
        </div>
      </FieldGroup>
    </form>
  );
}
