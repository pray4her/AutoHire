"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  FolderArchive,
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

type ListItem = {
  applicationId: string;
  customerNo: string;
  screeningPassportFullName: string | null;
  screeningContactEmail: string | null;
  screeningWorkEmail: string | null;
  invitationEmail: string | null;
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

export function ExpertFilesPanel() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "submitted" | "unsubmitted">(
    "all",
  );
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
        throw new Error(payload.error ?? "Failed to load expert files.");
      }
      setItems(payload.items);
      setTotal(payload.total);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, [q, status, startDate, endDate, page]);

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
        throw new Error(payload.error ?? "Failed to load detail.");
      }
      setDetail(payload);
      setDetailOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Detail failed.");
    }
  }

  async function prepareExport(mode: "filter" | "ids") {
    if (hasRunningJob) {
      toast.error("An export job is already in progress.");
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
      toast.error("Select at least one expert.");
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
        throw new Error(payload.error ?? "Estimate failed.");
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
      toast.error(error instanceof Error ? error.message : "Estimate failed.");
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
        throw new Error(payload.error ?? "Export create failed.");
      }
      toast.success("Export job started.");
      setConfirmOpen(false);
      setPendingExport(null);
      await loadJobs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed.");
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
        throw new Error(payload.error ?? "Download unavailable.");
      }
      window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
      toast.message("Use 7-Zip or WinRAR if Chinese folder names look garbled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed.");
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
        throw new Error(payload.error ?? "Retry failed.");
      }
      toast.success("Retry started.");
      await loadJobs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Retry failed.");
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
        <div className="flex items-center gap-2 text-muted-foreground">
          <FolderArchive />
          <span className="text-sm tracking-wide uppercase">Operations</span>
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Expert files
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Search by name, email, or customer number. Export ZIP packages for
          internal review. Packages keep the dossier folder layout and expire
          after 7 days.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>
            Default range is the last {OPS_EXPORT_DEFAULT_LOOKBACK_DAYS} days
            (fill time). Only applications with a customer number are listed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field>
              <FieldLabel htmlFor="expert-q">Name / email / customer no.</FieldLabel>
              <Input
                id="expert-q"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search…"
              />
            </Field>
            <Field>
              <FieldLabel>Status</FieldLabel>
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
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="unsubmitted">Not submitted</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="start-date">Fill time from</FieldLabel>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="end-date">Fill time to</FieldLabel>
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
              Search
            </Button>
            <Button
              variant="outline"
              disabled={hasRunningJob}
              onClick={() => void prepareExport("filter")}
            >
              <Download data-icon="inline-start" />
              Export matched
            </Button>
            <Button
              variant="outline"
              disabled={hasRunningJob || selected.size === 0}
              onClick={() => void prepareExport("ids")}
            >
              <Download data-icon="inline-start" />
              Export selected ({selected.size})
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              {total} matched · page {page}
            </CardDescription>
          </div>
          {loading ? <Spinner /> : null}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Customer no.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fill time</TableHead>
                <TableHead>Submitted</TableHead>
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
                    <Badge variant={item.isSubmitted ? "default" : "secondary"}>
                      {item.isSubmitted ? "Submitted" : "In progress"}
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
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground">
                    No applications in this range.
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
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 20 >= total}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Export jobs</CardTitle>
            <CardDescription>
              Shared across ops users. Download links last 1 hour; ZIP objects
              are kept for 7 days.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadJobs()}>
            <RefreshCw data-icon="inline-start" />
            Refresh
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
                  <Badge variant="outline">{job.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {job.exportableCount} experts ·{" "}
                  {formatBytes(job.estimatedBytes)} · created{" "}
                  {formatTime(job.createdAt)}
                  {job.excludedEmptyCount
                    ? ` · excluded empty ${job.excludedEmptyCount}`
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
                    Download
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
                    Retry
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No export jobs yet.</p>
          ) : null}
        </CardContent>
      </Card>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {(detail?.customerNo as string | undefined) ?? "Expert dossier"}
            </SheetTitle>
            <SheetDescription>
              Read-only file inventory. Single-file download is not available.
            </SheetDescription>
          </SheetHeader>
          {detail ? (
            <div className="mt-4 flex flex-col gap-4 px-1">
              <div className="grid gap-1 text-sm">
                <div>
                  <span className="text-muted-foreground">Name: </span>
                  {(detail.screeningPassportFullName as string) ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Email: </span>
                  {(detail.screeningContactEmail as string) ??
                    (detail.screeningWorkEmail as string) ??
                    "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  {String(detail.applicationStatus)}
                </div>
                <div>
                  <span className="text-muted-foreground">Fill time: </span>
                  {formatTime(detail.resumeUploadedAt as string | null)}
                </div>
                <div>
                  <span className="text-muted-foreground">Submitted: </span>
                  {formatTime(detail.submittedAt as string | null)}
                </div>
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <h3 className="font-medium">Folders</h3>
                {(inventory?.folderSummaries ?? []).map((folder) => (
                  <div
                    key={folder.folder}
                    className="flex justify-between text-sm"
                  >
                    <span>{folder.folder}</span>
                    <span className="text-muted-foreground">
                      {folder.fileCount} files
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-medium">Files</h3>
                {(inventory?.files ?? []).map((file) => (
                  <div key={file.archivePath} className="text-sm">
                    <div className="font-mono text-xs text-muted-foreground">
                      {file.archivePath}
                    </div>
                    <div>
                      {file.fileName} · {formatBytes(file.fileSize)} ·{" "}
                      {file.source}
                    </div>
                  </div>
                ))}
                {(inventory?.files?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No current files.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm export</DialogTitle>
            <DialogDescription>
              Create an asynchronous ZIP export job. Extract with 7-Zip/WinRAR
              for Chinese paths.
            </DialogDescription>
          </DialogHeader>
          {pendingExport ? (
            <div className="flex flex-col gap-2 text-sm">
              <div>Mode: {pendingExport.mode}</div>
              <div>Experts: {pendingExport.exportableCount}</div>
              <div>
                Excluded empty: {pendingExport.excludedEmptyCount}
              </div>
              <div>
                Estimated size: {formatBytes(pendingExport.estimatedBytes)}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button disabled={exporting} onClick={() => void confirmExport()}>
              {exporting ? <Spinner data-icon="inline-start" /> : null}
              Start export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
