"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, Share2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Funnel = {
  clickCount: number;
  registrationCount: number;
  applicationCount: number;
};

type Token = {
  id: string;
  referrerEmail: string;
  referrerDisplayName: string | null;
  plaintextToken: string;
  status: string;
  expiredAt: string;
  funnel: Funnel;
};

type Downstream = {
  applicationId: string;
  email: string | null;
  progressStage: string;
};

type Entry = { email: string; displayName?: string };

function entriesFromText(value: string): Entry[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [email, displayName] = line
        .split(/[,\t]/)
        .map((part) => part.trim());
      return {
        email: email ?? "",
        ...(displayName ? { displayName } : {}),
      };
    })
    .filter((entry) => entry.email.includes("@"));
}

function referralHref(plaintextToken: string) {
  return `${window.location.origin}/referral?t=${plaintextToken}`;
}

export function ReferralOpsPanel() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [items, setItems] = useState<Token[]>([]);
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [downstream, setDownstream] = useState<Record<string, Downstream[]>>(
    {},
  );
  const [passwordOpen, setPasswordOpen] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/ops/referral-tokens", {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error("加载历史失败。");
    }
    const payload = (await response.json()) as { items: Token[] };
    setItems(payload.items);
  }, []);

  useEffect(() => {
    void load().catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : "加载失败。");
    });
  }, [load]);

  async function logout() {
    try {
      await fetch("/api/ops/referral-auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.replace("/ops/referrals/login");
      router.refresh();
    } catch {
      toast.error("退出失败。");
    }
  }

  async function generate(entries: Entry[]) {
    if (entries.length === 0) {
      toast.error("请至少填写一个有效邮箱。");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/ops/referral-tokens/generate", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const payload = (await response.json()) as {
        results?: Array<{ skipped: boolean; referralLink: string }>;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "生成失败，请检查邮箱格式。");
      }
      const skipped = payload.results?.filter((row) => row.skipped).length ?? 0;
      const created = (payload.results?.length ?? 0) - skipped;
      await load();
      toast.success(
        skipped > 0
          ? `新建 ${created} 条，跳过当前账号下已有有效链接 ${skipped} 条。`
          : `已生成 ${created} 条推荐链接。`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成失败。");
    } finally {
      setBusy(false);
    }
  }

  async function onExcel(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
      if (!sheet) {
        throw new Error("Excel 中没有工作表。");
      }
      const rows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(
        sheet,
        { header: 1, defval: "" },
      );
      const entries: Entry[] = [];
      for (const row of rows) {
        const email = String(row[0] ?? "")
          .trim()
          .toLowerCase();
        if (!email.includes("@")) continue;
        const displayName = String(row[1] ?? "").trim();
        entries.push({
          email,
          ...(displayName ? { displayName } : {}),
        });
      }
      await generate(entries);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "解析 Excel 失败。");
      setBusy(false);
    }
  }

  async function mutate(
    tokenId: string,
    action: "DISABLE" | "RENEW" | "REGENERATE",
  ) {
    setBusy(true);
    try {
      const response = await fetch(`/api/ops/referral-tokens/${tokenId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        throw new Error("操作失败。");
      }
      const payload = (await response.json()) as {
        referralLink?: string;
        plaintextToken?: string;
      };
      await load();
      if (action === "REGENERATE" && payload.referralLink) {
        await navigator.clipboard.writeText(payload.referralLink);
        toast.success("已重新生成并复制新链接。");
      } else {
        toast.success("已更新。");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败。");
    } finally {
      setBusy(false);
    }
  }

  async function toggleExpand(tokenId: string) {
    if (expandedId === tokenId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(tokenId);
    if (downstream[tokenId]) return;
    const response = await fetch(
      `/api/ops/referral-tokens/${tokenId}/downstream`,
      { credentials: "include" },
    );
    if (!response.ok) {
      toast.error("加载下游账号失败。");
      return;
    }
    const payload = (await response.json()) as { items: Downstream[] };
    setDownstream((prev) => ({ ...prev, [tokenId]: payload.items }));
  }

  return (
    <main className="text-foreground min-h-screen bg-[radial-gradient(circle_at_top_left,var(--muted),transparent_32rem),linear-gradient(135deg,var(--background),var(--secondary))] px-6 py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Card className="border-foreground/10 bg-background/85 w-full overflow-hidden shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Share2 data-icon="inline-start" />
              推荐链接
            </CardTitle>
            <CardDescription>
              输入推荐人邮箱（可选显示名），生成后由内部同事线下发给推荐人。系统不发送邮件。
              当前账号下同一邮箱仅保留一条有效链接；重复导入会跳过并保留现链。历史中可复制现有明文链接。
            </CardDescription>
            <CardAction>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPasswordOpen(true)}
                >
                  <KeyRound data-icon="inline-start" />
                  修改密码
                </Button>
                <Badge variant="secondary">已登录</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void logout()}
                >
                  <LogOut data-icon="inline-start" />
                  退出
                </Button>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={"name@example.com, 张三"}
              rows={6}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                disabled={busy || !text.trim()}
                onClick={() => void generate(entriesFromText(text))}
              >
                生成链接
              </Button>
              <label className="text-muted-foreground inline-flex cursor-pointer items-center gap-2 text-sm">
                <span>上传 Excel（第一列邮箱，第二列可选姓名）</span>
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="max-w-xs"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    void onExcel(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          </CardContent>
        </Card>

        <Card className="border-foreground/10 bg-background/90 w-full shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle>历史</CardTitle>
            <CardDescription>
              可复制链接、续期、重新生成或作废；展开查看下游注册账号。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 ? (
              <p className="text-muted-foreground text-sm">暂无生成记录。</p>
            ) : null}
            {items.map((item) => (
              <div
                key={item.id}
                className="space-y-2 rounded-md border p-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {item.referrerDisplayName ?? item.referrerEmail}
                    </p>
                    {item.referrerDisplayName ? (
                      <p className="text-muted-foreground">
                        {item.referrerEmail}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground mt-1">
                      {item.status} · 点击 {item.funnel.clickCount} · 注册{" "}
                      {item.funnel.registrationCount} · 申报{" "}
                      {item.funnel.applicationCount}
                    </p>
                    <p className="text-muted-foreground font-mono text-xs break-all">
                      {referralHref(item.plaintextToken)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(referralHref(item.plaintextToken))
                          .then(() => toast.success("已复制链接。"))
                      }
                    >
                      复制链接
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy || item.status !== "ACTIVE"}
                      onClick={() => void mutate(item.id, "RENEW")}
                    >
                      续期
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void mutate(item.id, "REGENERATE")}
                    >
                      重新生成
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy || item.status === "DISABLED"}
                      onClick={() => void mutate(item.id, "DISABLE")}
                    >
                      作废
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void toggleExpand(item.id)}
                    >
                      {expandedId === item.id ? "收起下游" : "展开下游"}
                    </Button>
                  </div>
                </div>
                {expandedId === item.id ? (
                  <div className="bg-muted/40 rounded-md p-3">
                    {(downstream[item.id] ?? []).length === 0 ? (
                      <p className="text-muted-foreground text-xs">
                        暂无注册账号。
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {(downstream[item.id] ?? []).map((row) => (
                          <li
                            key={row.applicationId}
                            className="flex flex-wrap justify-between gap-2 text-xs"
                          >
                            <span>{row.email ?? row.applicationId}</span>
                            <span className="text-muted-foreground">
                              {row.progressStage}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <ChangePasswordDialog
          open={passwordOpen}
          onOpenChange={setPasswordOpen}
          endpoint="/api/ops/referral-auth/change-password"
        />
      </div>
    </main>
  );
}
