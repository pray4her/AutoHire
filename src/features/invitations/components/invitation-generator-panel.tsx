"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut } from "lucide-react";
import { toast } from "sonner";

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
import type { InviteHashAlgorithm } from "@/lib/auth/token";
import type { InvitationGenerationBatchSummary } from "@/lib/invitations/types";

import { InvitationBatchResultCard } from "./invitation-batch-result-card";
import { InvitationGeneratorForm } from "./invitation-generator-form";
import {
  createDefaultIdempotencyKey,
  getAlgorithmDescription,
} from "./invitation-generator-options";
import { readGenerateResponse } from "./invitation-generator-response";

export function InvitationGeneratorPanel() {
  const router = useRouter();
  const [algorithm, setAlgorithm] = useState<InviteHashAlgorithm>("SHA256");
  const [count, setCount] = useState("100");
  const [expiredDays, setExpiredDays] = useState("90");
  const [expiredHours, setExpiredHours] = useState("0");
  const [expiredMinutes, setExpiredMinutes] = useState("0");
  const [idempotencyKey, setIdempotencyKey] = useState(
    createDefaultIdempotencyKey,
  );
  const [batch, setBatch] = useState<InvitationGenerationBatchSummary | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const selectedDescription = useMemo(
    () => getAlgorithmDescription(algorithm),
    [algorithm],
  );
  const exportFilename = batch ? `邀请令牌-${batch.id}.xlsx` : "邀请令牌.xlsx";

  function handleExpiredDaysChange(nextDays: string) {
    setExpiredDays(nextDays);
    const daysValue = Number(nextDays);
    if (Number.isFinite(daysValue) && daysValue > 0) {
      setExpiredHours("0");
      setExpiredMinutes("0");
    }
  }

  async function logout() {
    try {
      await fetch("/api/ops/expert-files/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.replace("/ops/invitations/login");
      router.refresh();
    } catch {
      toast.error("退出失败。");
    }
  }

  async function generateBatch() {
    setIsGenerating(true);

    try {
      const response = await fetch("/api/ops/invitations/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          algorithm,
          count: Number(count),
          expiredDays: Number(expiredDays),
          expiredHours: Number(expiredHours),
          expiredMinutes: Number(expiredMinutes),
          idempotencyKey,
        }),
      });
      const payload = await readGenerateResponse(response);

      setBatch(payload.batch);
      toast.success("邀请令牌已准备就绪。");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "邀请令牌生成失败。";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function exportBatch() {
    if (!batch) {
      return;
    }

    setIsExporting(true);

    try {
      const response = await fetch(
        `/api/ops/invitations/batches/${encodeURIComponent(batch.id)}/export`,
        { credentials: "include" },
      );

      if (!response.ok) {
        throw new Error("Excel 导出失败。");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = exportFilename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      toast.success("Excel 文件已下载。");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Excel 导出失败。";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="text-foreground min-h-screen bg-[radial-gradient(circle_at_top_left,var(--muted),transparent_32rem),linear-gradient(135deg,var(--background),var(--secondary))] px-6 py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Card className="border-foreground/10 bg-background/85 w-full overflow-hidden shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <KeyRound data-icon="inline-start" />
              邀请令牌生成器
            </CardTitle>
            <CardDescription>
              为邮件运营生成具备幂等性的邀请批次。原始令牌仅保留在受保护的生成批次中。
            </CardDescription>
            <CardAction>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">运维受保护</Badge>
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
            <InvitationGeneratorForm
              algorithm={algorithm}
              count={count}
              expiredDays={expiredDays}
              expiredHours={expiredHours}
              expiredMinutes={expiredMinutes}
              idempotencyKey={idempotencyKey}
              isGenerating={isGenerating}
              selectedDescription={selectedDescription}
              onAlgorithmChange={setAlgorithm}
              onCountChange={setCount}
              onExpiredDaysChange={handleExpiredDaysChange}
              onExpiredHoursChange={setExpiredHours}
              onExpiredMinutesChange={setExpiredMinutes}
              onGenerate={() => void generateBatch()}
              onIdempotencyKeyChange={setIdempotencyKey}
            />
          </CardContent>
        </Card>

        {batch ? (
          <InvitationBatchResultCard
            batch={batch}
            isExporting={isExporting}
            onExport={() => void exportBatch()}
          />
        ) : null}
      </div>
    </main>
  );
}
