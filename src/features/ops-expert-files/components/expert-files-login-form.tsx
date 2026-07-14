"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FolderArchive } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function ExpertFilesLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/ops/expert-files/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "登录失败。");
      }
      toast.success("登录成功。");
      router.replace("/ops/expert-files");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登录失败。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <header className="flex flex-col gap-2 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <FolderArchive />
          <span className="text-sm tracking-wide">运营后台</span>
        </div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          专家档案登录
        </h1>
        <p className="text-sm text-muted-foreground">
          使用运营账号与密码进入专家档案。
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>登录</CardTitle>
          <CardDescription>仅用于专家档案页面，不影响其他运营入口。</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="ops-username">用户名</FieldLabel>
                <Input
                  id="ops-username"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ops-password">密码</FieldLabel>
                <Input
                  id="ops-password"
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
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
