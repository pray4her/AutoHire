"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { captureReferralContextAction } from "@/features/account-auth/actions";
import { authClient } from "@/lib/account-auth/client";
import { otpErrorMessage } from "@/features/account-auth/error-messages";

type SignupFormProps = {
  initialEmail?: string;
  initialStep?: "credentials" | "verify";
  referralPlaintextToken?: string;
  nextPath?: string;
};

function defaultNameFromEmail(email: string) {
  return email.split("@")[0] || email;
}

export function SignupForm({
  initialEmail = "",
  initialStep = "credentials",
  referralPlaintextToken,
  nextPath,
}: SignupFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "verify">(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!referralPlaintextToken) {
      return;
    }
    void captureReferralContextAction(referralPlaintextToken);
  }, [referralPlaintextToken]);

  async function onSubmitCredentials(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (referralPlaintextToken) {
        await captureReferralContextAction(referralPlaintextToken);
      }
      const { error } = await authClient.signUp.email({
        email,
        password,
        name: defaultNameFromEmail(email),
      });
      if (error) {
        throw new Error(error.message ?? "注册失败。");
      }
      toast.success("验证码已发送到你的邮箱。");
      setStep("verify");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "注册失败。");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitOtp(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await authClient.emailOtp.verifyEmail({ email, otp });
      if (error) {
        throw new Error(otpErrorMessage(error, "验证失败。"));
      }
      toast.success("邮箱验证成功，已为你登录。");
      router.replace((nextPath ?? "/account") as "/apply/resume" | "/account");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "验证失败。");
    } finally {
      setSubmitting(false);
    }
  }

  async function onResendOtp() {
    setSubmitting(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      if (error) {
        throw new Error(error.message ?? "发送失败。");
      }
      toast.success("验证码已重新发送。");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "发送失败。");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "verify") {
    return (
      <form onSubmit={onSubmitOtp}>
        <FieldGroup className="gap-4">
          <p className="text-muted-foreground text-sm">
            验证码已发送至 <span className="font-medium">{email}</span>
            ，10 分钟内有效。
          </p>
          <Field>
            <FieldLabel htmlFor="signup-otp">邮箱验证码</FieldLabel>
            <Input
              id="signup-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value.trim())}
              required
            />
          </Field>
          <Button
            type="submit"
            className="w-full"
            disabled={submitting || otp.length !== 6}
          >
            {submitting ? <Spinner data-icon="inline-start" /> : null}
            完成验证并登录
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={submitting}
            onClick={onResendOtp}
          >
            重新发送验证码
          </Button>
        </FieldGroup>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmitCredentials}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="signup-email">邮箱</FieldLabel>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value.trim())}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="signup-password">密码</FieldLabel>
          <Input
            id="signup-password"
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
          发送验证码并注册
        </Button>
        <p className="text-muted-foreground text-center text-sm">
          已有账号？{" "}
          <Link
            href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
            className="text-primary underline"
          >
            直接登录
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
