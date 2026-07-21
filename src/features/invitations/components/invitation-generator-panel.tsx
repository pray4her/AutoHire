"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, LogOut } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  INVITATION_GENERATION_DEFAULT_COUNT,
  INVITATION_GENERATION_DEFAULT_EXPIRED_DAYS,
  INVITATION_GENERATION_SOFT_CONFIRM_COUNT,
} from "@/lib/invitations/constants";
import type {
  InvitationGenerationBatchListItem,
  InvitationGenerationBatchSummary,
} from "@/lib/invitations/types";

import { InvitationBatchHistoryCard } from "./invitation-batch-history-card";
import { InvitationBatchResultCard } from "./invitation-batch-result-card";
import { InvitationGeneratorForm } from "./invitation-generator-form";
import {
  createDefaultIdempotencyKey,
  getAlgorithmDescription,
} from "./invitation-generator-options";
import { readGenerateResponse } from "./invitation-generator-response";

export function InvitationGeneratorPanel() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [algorithm, setAlgorithm] = useState<InviteHashAlgorithm>("SHA256");
  const [count, setCount] = useState(String(INVITATION_GENERATION_DEFAULT_COUNT));
  const [expiredDays, setExpiredDays] = useState(
    String(INVITATION_GENERATION_DEFAULT_EXPIRED_DAYS),
  );
  const [expiredHours, setExpiredHours] = useState("0");
  const [expiredMinutes, setExpiredMinutes] = useState("0");
  const [idempotencyKey, setIdempotencyKey] = useState(
    createDefaultIdempotencyKey,
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [batch, setBatch] = useState<InvitationGenerationBatchSummary | null>(
    null,
  );
  const [history, setHistory] = useState<
    readonly InvitationGenerationBatchListItem[]
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportingBatchId, setExportingBatchId] = useState<string | null>(null);
  const [viewingBatchId, setViewingBatchId] = useState<string | null>(null);
  const [pendingInvitationIds, setPendingInvitationIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedDescription = useMemo(
    () => getAlgorithmDescription(algorithm),
    [algorithm],
  );

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch("/api/ops/invitations/batches", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("加载近期批次失败。");
      }
      const payload = (await response.json()) as {
        batches?: InvitationGenerationBatchListItem[];
      };
      setHistory(Array.isArray(payload.batches) ? payload.batches : []);
    } catch {
      toast.error("加载近期批次失败。");
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

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

    const keyForRequest = advancedOpen
      ? idempotencyKey
      : createDefaultIdempotencyKey();

    if (!advancedOpen) {
      setIdempotencyKey(keyForRequest);
    }

    try {
      const response = await fetch("/api/ops/invitations/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          algorithm,
          count: Number(count),
          expiredDays: Number(expiredDays),
          expiredHours: Number(expiredHours),
          expiredMinutes: Number(expiredMinutes),
          idempotencyKey: keyForRequest,
        }),
      });
      const payload = await readGenerateResponse(response);

      setBatch(payload.batch);
      toast.success(
        `已生成 ${payload.batch.createdCount.toLocaleString("zh-CN")} 个邀请链接，请下载 Excel。`,
      );
      await loadHistory();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "邀请链接生成失败。";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }

  function requestGenerate() {
    const countValue = Number(count);
    if (
      Number.isFinite(countValue) &&
      countValue > INVITATION_GENERATION_SOFT_CONFIRM_COUNT
    ) {
      setConfirmOpen(true);
      return;
    }
    void generateBatch();
  }

  async function loadBatch(batchId: string) {
    setViewingBatchId(batchId);

    try {
      const response = await fetch(
        `/api/ops/invitations/batches/${encodeURIComponent(batchId)}`,
        { credentials: "include" },
      );
      const payload = await readGenerateResponse(response);
      setBatch(payload.batch);
      toast.success("已加载批次明细。");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "加载批次明细失败。";
      toast.error(message);
    } finally {
      setViewingBatchId(null);
    }
  }

  async function setDistributed(
    invitationIds: readonly string[],
    distributed: boolean,
  ) {
    if (!batch || invitationIds.length === 0) {
      return;
    }

    const idSet = new Set(invitationIds);
    const previousItems = batch.items;
    const optimisticAt = distributed ? new Date().toISOString() : null;

    setPendingInvitationIds(idSet);
    setBatch({
      ...batch,
      items: batch.items.map((item) =>
        idSet.has(item.invitationId)
          ? { ...item, distributedAt: optimisticAt }
          : item,
      ),
    });

    try {
      const results = await Promise.all(
        invitationIds.map(async (invitationId) => {
          const response = await fetch(
            `/api/ops/invitations/items/${encodeURIComponent(invitationId)}`,
            {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ distributed }),
            },
          );
          const payload = await response.json().catch(() => null);

          if (
            !response.ok ||
            !payload ||
            typeof payload !== "object" ||
            !("item" in payload)
          ) {
            const code =
              payload && typeof payload === "object" && "code" in payload
                ? String((payload as { code: unknown }).code)
                : "";
            const localized =
              code === "INVITATION_GENERATION_ITEM_NOT_FOUND"
                ? "未找到该邀请令牌。"
                : code === "OPS_EXPERT_FILES_SESSION_REQUIRED"
                  ? "需要有效的运营后台登录会话。"
                  : "更新已发出标记失败。";
            throw new Error(localized);
          }

          return {
            invitationId,
            distributedAt:
              (payload as { item: { distributedAt?: string | null } }).item
                .distributedAt ?? null,
          };
        }),
      );

      const resultById = new Map(
        results.map((result) => [result.invitationId, result.distributedAt]),
      );

      setBatch((current) =>
        current
          ? {
              ...current,
              items: current.items.map((entry) =>
                resultById.has(entry.invitationId)
                  ? {
                      ...entry,
                      distributedAt:
                        resultById.get(entry.invitationId) ?? null,
                    }
                  : entry,
              ),
            }
          : current,
      );

      if (invitationIds.length === 1) {
        toast.success(distributed ? "已标记为已发出。" : "已取消已发出标记。");
      } else {
        toast.success(
          distributed
            ? `已标记 ${invitationIds.length.toLocaleString("zh-CN")} 个为已发出。`
            : `已取消 ${invitationIds.length.toLocaleString("zh-CN")} 个已发出标记。`,
        );
      }
    } catch (error) {
      setBatch((current) =>
        current ? { ...current, items: previousItems } : current,
      );
      const message =
        error instanceof Error ? error.message : "更新已发出标记失败。";
      toast.error(message);
    } finally {
      setPendingInvitationIds(new Set());
    }
  }

  async function exportBatchById(batchId: string) {
    setExportingBatchId(batchId);

    try {
      const response = await fetch(
        `/api/ops/invitations/batches/${encodeURIComponent(batchId)}/export`,
        { credentials: "include" },
      );

      if (!response.ok) {
        throw new Error("Excel 导出失败。");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `邀请链接-${batchId}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      toast.success("Excel 文件已下载。");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Excel 导出失败。";
      toast.error(message);
    } finally {
      setExportingBatchId(null);
    }
  }

  return (
    <main className="text-foreground min-h-screen bg-[radial-gradient(circle_at_top_left,var(--muted),transparent_32rem),linear-gradient(135deg,var(--background),var(--secondary))] px-6 py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Card className="border-foreground/10 bg-background/85 w-full overflow-hidden shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Link2 data-icon="inline-start" />
              邀请链接
            </CardTitle>
            <CardDescription>
              生成可发给专家的报名链接，下载 Excel 后用于邮件发送。
            </CardDescription>
            <CardAction>
              <div className="flex items-center gap-2">
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
            <InvitationGeneratorForm
              name={name}
              algorithm={algorithm}
              count={count}
              expiredDays={expiredDays}
              expiredHours={expiredHours}
              expiredMinutes={expiredMinutes}
              idempotencyKey={idempotencyKey}
              isGenerating={isGenerating}
              selectedDescription={selectedDescription}
              advancedOpen={advancedOpen}
              onAdvancedOpenChange={setAdvancedOpen}
              onNameChange={setName}
              onAlgorithmChange={setAlgorithm}
              onCountChange={setCount}
              onExpiredDaysChange={handleExpiredDaysChange}
              onExpiredHoursChange={setExpiredHours}
              onExpiredMinutesChange={setExpiredMinutes}
              onGenerate={requestGenerate}
              onIdempotencyKeyChange={setIdempotencyKey}
            />
          </CardContent>
        </Card>

        {batch ? (
          <InvitationBatchResultCard
            batch={batch}
            isExporting={exportingBatchId === batch.id}
            pendingInvitationIds={pendingInvitationIds}
            onExport={() => void exportBatchById(batch.id)}
            onSetDistributed={(invitationIds, distributed) =>
              void setDistributed(invitationIds, distributed)
            }
          />
        ) : null}

        <InvitationBatchHistoryCard
          batches={history}
          exportingBatchId={exportingBatchId}
          viewingBatchId={viewingBatchId}
          isLoading={isLoadingHistory}
          onExport={(batchId) => void exportBatchById(batchId)}
          onView={(batchId) => void loadBatch(batchId)}
        />
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认生成大量邀请链接？</AlertDialogTitle>
            <AlertDialogDescription>
              将生成 {Number(count).toLocaleString("zh-CN")}{" "}
              个链接，可能需要较长时间。是否继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                void generateBatch();
              }}
            >
              继续生成
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
