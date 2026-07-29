"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type ChangePasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** POST endpoint accepting `{ currentPassword, newPassword }` JSON. */
  endpoint: string;
};

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
  autoFocus,
  invalid,
}: {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  invalid?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={invalid || undefined}
          className="pr-9"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={visible ? "隐藏密码" : "显示密码"}
          onClick={() => setVisible((prev) => !prev)}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 transition-colors"
        >
          {visible ? (
            <EyeOffIcon className="size-4" />
          ) : (
            <EyeIcon className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function RequirementRow({ met, label }: { met: boolean; label: string }) {
  return (
    <li
      className={cn(
        "flex items-center gap-1.5 transition-colors duration-200",
        met ? "text-primary" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "grid size-4 place-items-center rounded-full border transition-colors duration-200",
          met
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40",
        )}
      >
        <CheckIcon className="size-2.5" strokeWidth={3} />
      </span>
      {label}
    </li>
  );
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  endpoint,
}: ChangePasswordDialogProps) {
  const idPrefix = useId();
  const reduceMotion = useReducedMotion();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const lengthOk = newPassword.length >= 8;
  const matchOk = confirmPassword.length > 0 && newPassword === confirmPassword;
  const confirmMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const showRequirements = newPassword.length > 0 || confirmPassword.length > 0;

  function close() {
    if (submitting) return;
    onOpenChange(false);
  }

  useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit() {
    if (!lengthOk) {
      toast.error("新密码至少 8 位。");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("两次输入的新密码不一致。");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "修改密码失败。");
      }
      toast.success("密码已更新。");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "修改密码失败。");
    } finally {
      setSubmitting(false);
    }
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <motion.div
            aria-hidden
            className="bg-background/80 supports-backdrop-filter:bg-background/60 absolute inset-0 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onMouseDown={close}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${idPrefix}-title`}
            className="bg-popover text-popover-foreground relative w-full max-w-sm rounded-xl border shadow-xl"
            initial={
              reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 12 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              reduceMotion
                ? { opacity: 0, transition: { duration: 0.1 } }
                : {
                    opacity: 0,
                    scale: 0.96,
                    y: 8,
                    transition: { duration: 0.15, ease: "easeIn" },
                  }
            }
            transition={
              reduceMotion
                ? { duration: 0.15 }
                : { type: "spring", stiffness: 420, damping: 32, mass: 0.9 }
            }
          >
            <button
              type="button"
              aria-label="关闭"
              onClick={close}
              className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-3 right-3 grid size-7 place-items-center rounded-md transition-colors"
            >
              <XIcon className="size-4" />
            </button>

            <div className="flex items-start gap-3 px-5 pt-5">
              <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-lg">
                <KeyRoundIcon className="size-4" />
              </span>
              <div className="flex flex-col gap-1 pr-8">
                <h2
                  id={`${idPrefix}-title`}
                  className="text-base leading-snug font-medium"
                >
                  修改密码
                </h2>
                <p className="text-muted-foreground text-sm leading-snug">
                  修改成功后当前会话会刷新，其他已登录会话将失效。
                </p>
              </div>
            </div>

            <form
              className="flex flex-col gap-4 px-5 pt-4 pb-5"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <PasswordField
                id={`${idPrefix}-current`}
                label="当前密码"
                autoComplete="current-password"
                autoFocus
                value={currentPassword}
                onChange={setCurrentPassword}
              />
              <PasswordField
                id={`${idPrefix}-new`}
                label="新密码"
                autoComplete="new-password"
                value={newPassword}
                onChange={setNewPassword}
              />
              <PasswordField
                id={`${idPrefix}-confirm`}
                label="确认新密码"
                autoComplete="new-password"
                invalid={confirmMismatch}
                value={confirmPassword}
                onChange={setConfirmPassword}
              />

              <AnimatePresence initial={false}>
                {showRequirements ? (
                  <motion.ul
                    className="flex flex-col gap-1.5 overflow-hidden text-xs"
                    initial={
                      reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }
                    }
                    animate={
                      reduceMotion
                        ? { opacity: 1 }
                        : { opacity: 1, height: "auto" }
                    }
                    exit={
                      reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }
                    }
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <RequirementRow met={lengthOk} label="至少 8 个字符" />
                    <RequirementRow met={matchOk} label="两次输入一致" />
                  </motion.ul>
                ) : null}
              </AnimatePresence>

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={close}
                >
                  取消
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Spinner data-icon="inline-start" /> : null}
                  保存
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
