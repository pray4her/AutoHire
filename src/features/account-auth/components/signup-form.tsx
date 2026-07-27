"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
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

const RESEND_COUNTDOWN_SECONDS = 60;

type SignupFormProps = {
  initialEmail?: string;
  referralPlaintextToken?: string;
  nextPath?: string;
};

function defaultNameFromEmail(email: string) {
  return email.split("@")[0] || email;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function SignupForm({
  initialEmail = "",
  referralPlaintextToken,
  nextPath,
}: SignupFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!referralPlaintextToken) {
      return;
    }
    void captureReferralContextAction(referralPlaintextToken);
  }, [referralPlaintextToken]);

  useEffect(() => {
    return () => {
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
      }
    };
  }, []);

  function startCountdown() {
    setCountdown(RESEND_COUNTDOWN_SECONDS);
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
    }
    countdownTimer.current = setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          if (countdownTimer.current) {
            clearInterval(countdownTimer.current);
            countdownTimer.current = null;
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }

  async function onSendCode() {
    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email address first.");
      return;
    }
    setSendingCode(true);
    try {
      // The "sign-in" OTP type also reaches addresses that do not have an
      // account yet — the account is created when the form is submitted.
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (error) {
        throw new Error(error.message ?? "Failed to send the code.");
      }
      toast.success(`Verification code sent to ${email}.`);
      setCodeSent(true);
      startCountdown();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send the code.",
      );
    } finally {
      setSendingCode(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (referralPlaintextToken) {
        await captureReferralContextAction(referralPlaintextToken);
      }
      const { error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name: defaultNameFromEmail(email),
      });
      // An account left unverified by an earlier attempt is fine here — the
      // OTP sign-in below completes verification. Any other failure aborts.
      const accountAlreadyExisted =
        signUpError?.code === "USER_ALREADY_EXISTS";
      if (signUpError && !accountAlreadyExisted) {
        throw new Error(signUpError.message ?? "Sign-up failed.");
      }
      const { error: verifyError } = await authClient.signIn.emailOtp({
        email,
        otp,
      });
      if (verifyError) {
        throw new Error(
          accountAlreadyExisted
            ? "This email is already registered. Sign in instead, or resend the code if you have not verified yet."
            : otpErrorMessage(verifyError, "Verification failed."),
        );
      }
      toast.success("Email verified. You are now signed in.");
      router.replace((nextPath ?? "/account") as "/apply/resume" | "/account");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-up failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="signup-email">Email</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              className="flex-1"
              value={email}
              onChange={(event) => setEmail(event.target.value.trim())}
              required
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              disabled={sendingCode || countdown > 0 || !isValidEmail(email)}
              onClick={() => void onSendCode()}
            >
              {sendingCode ? <Spinner data-icon="inline-start" /> : null}
              {countdown > 0
                ? `Resend in ${countdown}s`
                : codeSent
                  ? "Resend Code"
                  : "Send Code"}
            </Button>
          </div>
        </Field>
        <Field>
          <FieldLabel htmlFor="signup-password">Password</FieldLabel>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <p className="text-muted-foreground text-xs">
            At least 8 characters.
          </p>
        </Field>
        <Field>
          <FieldLabel htmlFor="signup-otp">Verification Code</FieldLabel>
          <Input
            id="signup-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value.trim())}
            required
          />
          <p className="text-muted-foreground text-xs">
            {codeSent
              ? `Enter the 6-digit code sent to ${email}. It is valid for 10 minutes.`
              : 'Click "Send Code" to receive a 6-digit code by email.'}
          </p>
        </Field>
        <Button
          type="submit"
          className="w-full"
          disabled={submitting || otp.length !== 6}
        >
          {submitting ? <Spinner data-icon="inline-start" /> : null}
          Create Account
        </Button>
        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
          <Link
            href={
              nextPath
                ? `/login?next=${encodeURIComponent(nextPath)}`
                : "/login"
            }
            className="text-primary underline"
          >
            Sign in
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
