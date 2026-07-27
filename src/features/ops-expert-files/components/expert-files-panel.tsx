"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FolderArchive,
  KeyRound,
  LogOut,
  RefreshCw,
  Search,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OPS_EXPORT_DEFAULT_LOOKBACK_DAYS } from "@/lib/ops-expert-files/constants";
import type { InvitationSource } from "@/lib/data/store";

type ListItem = {
  applicationId: string;
  customerNo: string;
  screeningPassportFullName: string | null;
  screeningContactEmail: string | null;
  screeningWorkEmail: string | null;
  invitationEmail: string | null;
  invitationSource: InvitationSource;
  applicationStatus: string;
  isSubmitted: boolean;
  resumeUploadedAt: string | null;
  submittedAt: string | null;
};

type ExportJob = {
  id: string;
  status: string;
  exportableCount: number;
  excludedEmptyCount: number;
  estimatedBytes: number;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
};

const JOB_STATUS_LABELS: Record<string, string> = {
  PENDING: "等待中",
  RUNNING: "进行中",
  SUCCEEDED: "已成功",
  SUCCEEDED_WITH_GAPS: "成功（有缺失）",
  FAILED: "失败",
};

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  INIT: "初始化",
  INTRO_VIEWED: "已查看介绍",
  CV_UPLOADED: "已上传简历",
  CV_ANALYZING: "简历分析中",
  CV_EXTRACTING: "简历提取中",
  CV_EXTRACTION_REVIEW: "简历提取审核",
  INFO_REQUIRED: "需补充信息",
  REANALYZING: "重新分析中",
  INELIGIBLE: "不合格",
  ELIGIBLE: "合格",
  MATERIALS_IN_PROGRESS: "材料填写中",
  SUBMITTED: "已提交",
  CLOSED: "已关闭",
  SECONDARY_ANALYZING: "二次分析中",
  SECONDARY_REVIEW: "二次审核",
  SECONDARY_FAILED: "二次分析失败",
};

const FILE_SOURCE_LABELS: Record<string, string> = {
  resume: "简历",
  initial: "初筛材料",
  supplement: "补充材料",
  extraction: "提取导出",
  secondary: "二次分析导出",
};

function defaultStartDate() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - OPS_EXPORT_DEFAULT_LOOKBACK_DAYS);
  return start.toISOString().slice(0, 10);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatTime(value: string | null) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function formatJobStatus(status: string) {
  return JOB_STATUS_LABELS[status] ?? status;
}

function formatApplicationStatus(status: string) {
  return APPLICATION_STATUS_LABELS[status] ?? status;
}

function formatFileSource(source: string) {
  return FILE_SOURCE_LABELS[source] ?? source;
}

export function ExpertFilesPanel() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "submitted" | "unsubmitted">(
    "all",
  );
  const [source, setSource] = useState<"all" | "OPS" | "ACCOUNT">("all");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [items, setItems] = useState<ListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [pendingExport, setPendingExport] = useState<{
    mode: "filter" | "ids";
    estimateToken: string;
    exportableCount: number;
    excludedEmptyCount: number;
    estimatedBytes: number;
    applicationIds?: string[];
  } | null>(null);
  const [exporting, setExporting] = useState(false);

  const hasRunningJob = useMemo(
    () => jobs.some((job) => ["PENDING", "RUNNING"].includes(job.status)),
    [jobs],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q,
        status,
        source,
        startDate,
        endDate,
        page: String(page),
        pageSize: "20",
      });
      const response = await fetch(`/api/ops/expert-files?${params}`, {
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "加载专家档案失败。");
      }
      setItems(payload.items);
      setTotal(payload.total);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败。");
    } finally {
      setLoading(false);
    }
  }, [q, status, source, startDate, endDate, page]);

  const loadJobs = useCallback(async () => {
    try {
      const response = await fetch("/api/ops/expert-files/exports", {
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok) {
        return;
      }
      setJobs(
        (payload.items ?? []).map(
          (job: ExportJob & { createdAt: string | Date }) => ({
            ...job,
            createdAt:
              typeof job.createdAt === "string"
                ? job.createdAt
                : new Date(job.createdAt).toISOString(),
            finishedAt: job.finishedAt
              ? typeof job.finishedAt === "string"
                ? job.finishedAt
                : new Date(job.finishedAt).toISOString()
              : null,
          }),
        ),
      );
    } catch {
      // ignore polling errors
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!hasRunningJob) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadJobs();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [hasRunningJob, loadJobs]);

  function toggleSelect(applicationId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(applicationId);
      } else {
        next.delete(applicationId);
      }
      return next;
    });
  }

  async function openDetail(applicationId: string) {
    try {
      const response = await fetch(
        `/api/ops/expert-files/${encodeURIComponent(applicationId)}`,
        { credentials: "include" },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "加载详情失败。");
      }
      setDetail(payload);
      setDetailOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载详情失败。");
    }
  }

  async function prepareExport(mode: "filter" | "ids") {
    if (hasRunningJob) {
      toast.error("已有导出任务正在进行中。");
      return;
    }

    const body =
      mode === "filter"
        ? {
            mode: "filter" as const,
            filter: { q, status, startDate, endDate },
          }
        : {
            mode: "ids" as const,
            applicationIds: [...selected],
          };

    if (mode === "ids" && selected.size === 0) {
      toast.error("请至少选择一位专家。");
      return;
    }

    try {
      const response = await fetch("/api/ops/expert-files/exports/estimate", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "预估失败。");
      }
      setPendingExport({
        mode,
        estimateToken: payload.estimateToken,
        exportableCount: payload.exportableCount,
        excludedEmptyCount: payload.excludedEmptyCount,
        estimatedBytes: payload.estimatedBytes,
        applicationIds: mode === "ids" ? [...selected] : undefined,
      });
      setConfirmOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "预估失败。");
    }
  }

  async function confirmExport() {
    if (!pendingExport) {
      return;
    }
    setExporting(true);
    try {
      const body =
        pendingExport.mode === "filter"
          ? {
              mode: "filter" as const,
              filter: { q, status, startDate, endDate },
              estimateToken: pendingExport.estimateToken,
            }
          : {
              mode: "ids" as const,
              applicationIds: pendingExport.applicationIds ?? [],
              estimateToken: pendingExport.estimateToken,
            };

      const response = await fetch("/api/ops/expert-files/exports", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "创建导出任务失败。");
      }
      toast.success("导出任务已开始。");
      setConfirmOpen(false);
      setPendingExport(null);
      await loadJobs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "导出失败。");
    } finally {
      setExporting(false);
    }
  }

  async function downloadJob(jobId: string) {
    try {
      const response = await fetch(
        `/api/ops/expert-files/exports/${encodeURIComponent(jobId)}/download-url`,
        { method: "POST", credentials: "include" },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "暂不可下载。");
      }
      window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
      toast.message("若中文文件夹名乱码，请使用 7-Zip 或 WinRAR 解压。");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "下载失败。");
    }
  }

  async function retryJob(jobId: string) {
    try {
      const response = await fetch(
        `/api/ops/expert-files/exports/${encodeURIComponent(jobId)}/retry`,
        { method: "POST", credentials: "include" },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "重试失败。");
      }
      toast.success("已重新开始导出。");
      await loadJobs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "重试失败。");
    }
  }

  async function logout() {
    try {
      await fetch("/api/ops/expert-files/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.replace("/ops/expert-files/login");
      router.refresh();
    } catch {
      toast.error("退出失败。");
    }
  }

  async function submitChangePassword() {
    if (newPassword.length < 8) {
      toast.error("新密码至少 8 位。");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("两次输入的新密码不一致。");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch(
        "/api/ops/expert-files/auth/change-password",
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "修改密码失败。");
      }
      toast.success("密码已更新。");
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "修改密码失败。");
    } finally {
      setChangingPassword(false);
    }
  }

  const inventory = detail?.inventory as
    | {
        files?: Array<{
          archivePath: string;
          fileName: string;
          fileSize: number;
          source: string;
        }>;
        folderSummaries?: Array<{ folder: string; fileCount: number }>;
      }
    | undefined;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FolderArchive />
            <span className="text-sm tracking-wide">运营后台</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPasswordOpen(true)}
            >
              <KeyRound data-icon="inline-start" />
              修改密码
            </Button>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              <LogOut data-icon="inline-start" />
              退出
            </Button>
          </div>
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          专家档案
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          可按姓名、邮箱或客户编号搜索，导出 ZIP 包供内部审阅。压缩包保留档案文件夹结构，下载链接有效期为
          7 天。
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>搜索</CardTitle>
          <CardDescription>
            默认范围为最近 {OPS_EXPORT_DEFAULT_LOOKBACK_DAYS}{" "}
            天（按填写时间）。仅展示已分配客户编号的申请。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Field>
              <FieldLabel htmlFor="expert-q">姓名 / 邮箱 / 客户编号</FieldLabel>
              <Input
                id="expert-q"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="搜索…"
              />
            </Field>
            <Field>
              <FieldLabel>状态</FieldLabel>
              <Select
                value={status}
                onValueChange={(value) => {
                  if (
                    value === "all" ||
                    value === "submitted" ||
                    value === "unsubmitted"
                  ) {
                    setStatus(value);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="submitted">已提交</SelectItem>
                    <SelectItem value="unsubmitted">未提交</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>来源</FieldLabel>
              <Select
                value={source}
                onValueChange={(value) => {
                  if (value === "all" || value === "OPS" || value === "ACCOUNT") {
                    setSource(value);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">全部来源</SelectItem>
                    <SelectItem value="OPS">邀请链接</SelectItem>
                    <SelectItem value="ACCOUNT">账号注册</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="start-date">填写时间起</FieldLabel>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="end-date">填写时间止</FieldLabel>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setPage(1);
                void loadList();
              }}
            >
              <Search data-icon="inline-start" />
              搜索
            </Button>
            <Button
              variant="outline"
              disabled={hasRunningJob}
              onClick={() => void prepareExport("filter")}
            >
              <Download data-icon="inline-start" />
              导出匹配结果
            </Button>
            <Button
              variant="outline"
              disabled={hasRunningJob || selected.size === 0}
              onClick={() => void prepareExport("ids")}
            >
              <Download data-icon="inline-start" />
              导出已选（{selected.size}）
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>结果</CardTitle>
            <CardDescription>
              共 {total} 条 · 第 {page} 页
            </CardDescription>
          </div>
          {loading ? <Spinner /> : null}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>客户编号</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>来源</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>填写时间</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.applicationId}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(item.applicationId)}
                      onCheckedChange={(checked) =>
                        toggleSelect(item.applicationId, checked === true)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.customerNo}
                  </TableCell>
                  <TableCell>{item.screeningPassportFullName ?? "—"}</TableCell>
                  <TableCell className="max-w-[220px] truncate">
                    {item.screeningContactEmail ??
                      item.screeningWorkEmail ??
                      item.invitationEmail ??
                      "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.invitationSource === "ACCOUNT"
                          ? "default"
                          : "outline"
                      }
                    >
                      {item.invitationSource === "ACCOUNT"
                        ? "账号注册"
                        : "邀请链接"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isSubmitted ? "default" : "secondary"}>
                      {item.isSubmitted ? "已提交" : "进行中"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatTime(item.resumeUploadedAt)}</TableCell>
                  <TableCell>{formatTime(item.submittedAt)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void openDetail(item.applicationId)}
                    >
                      <Eye data-icon="inline-start" />
                      查看
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground">
                    该范围内暂无申请记录。
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 20 >= total}
              onClick={() => setPage((value) => value + 1)}
            >
              下一页
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>导出任务</CardTitle>
            <CardDescription>
              运营账号共享可见。下载链接有效期 1 小时；ZIP
              文件保留 7 天。
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadJobs()}>
            <RefreshCw data-icon="inline-start" />
            刷新
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm">{job.id}</span>
                  <Badge variant="outline">{formatJobStatus(job.status)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {job.exportableCount} 位专家 ·{" "}
                  {formatBytes(job.estimatedBytes)} · 创建于{" "}
                  {formatTime(job.createdAt)}
                  {job.excludedEmptyCount
                    ? ` · 已排除空档案 ${job.excludedEmptyCount}`
                    : ""}
                </p>
                {job.errorMessage ? (
                  <p className="text-sm text-destructive">{job.errorMessage}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                {["SUCCEEDED", "SUCCEEDED_WITH_GAPS"].includes(job.status) ? (
                  <Button size="sm" onClick={() => void downloadJob(job.id)}>
                    <Download data-icon="inline-start" />
                    下载
                  </Button>
                ) : null}
                {["FAILED", "SUCCEEDED", "SUCCEEDED_WITH_GAPS"].includes(
                  job.status,
                ) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={hasRunningJob}
                    onClick={() => void retryJob(job.id)}
                  >
                    重试
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无导出任务。</p>
          ) : null}
        </CardContent>
      </Card>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {(detail?.customerNo as string | undefined) ?? "专家档案"}
            </SheetTitle>
            <SheetDescription>
              只读文件清单。暂不支持单文件下载。
            </SheetDescription>
          </SheetHeader>
          {detail ? (
            <div className="mt-4 flex flex-col gap-4 px-1">
              <div className="grid gap-1 text-sm">
                <div>
                  <span className="text-muted-foreground">姓名：</span>
                  {(detail.screeningPassportFullName as string) ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">邮箱：</span>
                  {(detail.screeningContactEmail as string) ??
                    (detail.screeningWorkEmail as string) ??
                    "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">状态：</span>
                  {formatApplicationStatus(String(detail.applicationStatus))}
                </div>
                <div>
                  <span className="text-muted-foreground">填写时间：</span>
                  {formatTime(detail.resumeUploadedAt as string | null)}
                </div>
                <div>
                  <span className="text-muted-foreground">提交时间：</span>
                  {formatTime(detail.submittedAt as string | null)}
                </div>
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <h3 className="font-medium">文件夹</h3>
                {(inventory?.folderSummaries ?? []).map((folder) => (
                  <div
                    key={folder.folder}
                    className="flex justify-between text-sm"
                  >
                    <span>{folder.folder}</span>
                    <span className="text-muted-foreground">
                      {folder.fileCount} 个文件
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-medium">文件</h3>
                {(inventory?.files ?? []).map((file) => (
                  <div key={file.archivePath} className="text-sm">
                    <div className="font-mono text-xs text-muted-foreground">
                      {file.archivePath}
                    </div>
                    <div>
                      {file.fileName} · {formatBytes(file.fileSize)} ·{" "}
                      {formatFileSource(file.source)}
                    </div>
                  </div>
                ))}
                {(inventory?.files?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无文件。</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认导出</DialogTitle>
            <DialogDescription>
              将创建异步 ZIP 导出任务。含中文路径时请使用 7-Zip / WinRAR
              解压。
            </DialogDescription>
          </DialogHeader>
          {pendingExport ? (
            <div className="flex flex-col gap-2 text-sm">
              <div>
                模式：
                {pendingExport.mode === "filter" ? "按筛选条件" : "按勾选"}
              </div>
              <div>可导出专家：{pendingExport.exportableCount}</div>
              <div>已排除空档案：{pendingExport.excludedEmptyCount}</div>
              <div>
                预估大小：{formatBytes(pendingExport.estimatedBytes)}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              取消
            </Button>
            <Button disabled={exporting} onClick={() => void confirmExport()}>
              {exporting ? <Spinner data-icon="inline-start" /> : null}
              开始导出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={passwordOpen}
        onOpenChange={(open) => {
          setPasswordOpen(open);
          if (!open) {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>
              修改成功后当前会话会刷新，其他已登录会话将失效。
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="current-password">当前密码</FieldLabel>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-password">新密码</FieldLabel>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">确认新密码</FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>
              取消
            </Button>
            <Button
              disabled={changingPassword}
              onClick={() => void submitChangePassword()}
            >
              {changingPassword ? <Spinner data-icon="inline-start" /> : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
