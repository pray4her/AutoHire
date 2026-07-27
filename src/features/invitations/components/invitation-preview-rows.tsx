"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { InvitationGenerationItemSummary } from "@/lib/invitations/types";
import { INVITATION_GENERATION_PREVIEW_LIMIT } from "@/lib/invitations/constants";
import { formatInvitationDateTime } from "@/lib/invitations/date-format";
import { cn } from "@/lib/utils";

function CopyLinkButton({ link }: { readonly link: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("邀请链接已复制。");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("无法复制邀请链接。");
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0"
            aria-label="复制邀请链接"
            data-no-paint=""
            onClick={(event) => {
              event.stopPropagation();
              void copyLink();
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
          />
        }
      >
        {copied ? <Check /> : <Copy />}
      </TooltipTrigger>
      <TooltipContent>{copied ? "已复制" : "复制链接"}</TooltipContent>
    </Tooltip>
  );
}

function isNoPaintTarget(target: EventTarget | null) {
  return (
    target instanceof Element && target.closest("[data-no-paint]") != null
  );
}

type PaintSession = {
  paintTo: boolean;
  touchedIds: Set<string>;
};

export function InvitationPreviewRows({
  batchName,
  expiresAt,
  items,
  totalCount,
  pendingInvitationIds = null,
  onSetDistributed,
}: {
  readonly batchName: string;
  readonly expiresAt: string;
  readonly items: readonly InvitationGenerationItemSummary[];
  readonly totalCount: number;
  readonly pendingInvitationIds?: ReadonlySet<string> | null;
  readonly onSetDistributed: (
    invitationIds: readonly string[],
    distributed: boolean,
  ) => void;
}) {
  const visibleItems = items.slice(0, INVITATION_GENERATION_PREVIEW_LIMIT);
  const hiddenCount = Math.max(totalCount - visibleItems.length, 0);
  const expiresAtLabel = formatInvitationDateTime(expiresAt);
  const [paintOverrides, setPaintOverrides] = useState<
    ReadonlyMap<string, boolean>
  >(() => new Map());
  const [isPainting, setIsPainting] = useState(false);
  const paintSessionRef = useRef<PaintSession | null>(null);
  const visibleItemsRef = useRef(visibleItems);
  const onSetDistributedRef = useRef(onSetDistributed);

  useEffect(() => {
    visibleItemsRef.current = visibleItems;
    onSetDistributedRef.current = onSetDistributed;
  });

  function effectiveDistributed(
    item: InvitationGenerationItemSummary,
  ): boolean {
    const override = paintOverrides.get(item.invitationId);
    if (override != null) {
      return override;
    }
    return item.distributedAt != null;
  }

  function paintItem(item: InvitationGenerationItemSummary) {
    const session = paintSessionRef.current;
    if (!session || session.touchedIds.has(item.invitationId)) {
      return;
    }

    session.touchedIds.add(item.invitationId);
    setPaintOverrides((current) => {
      const next = new Map(current);
      next.set(item.invitationId, session.paintTo);
      return next;
    });
  }

  function commitPaint() {
    const session = paintSessionRef.current;
    if (!session) {
      return;
    }

    paintSessionRef.current = null;
    setIsPainting(false);
    setPaintOverrides(new Map());

    const invitationIds = visibleItemsRef.current
      .filter((item) => {
        if (!session.touchedIds.has(item.invitationId)) {
          return false;
        }
        return (item.distributedAt != null) !== session.paintTo;
      })
      .map((item) => item.invitationId);

    if (invitationIds.length > 0) {
      onSetDistributedRef.current(invitationIds, session.paintTo);
    }
  }

  function startPaint(
    item: InvitationGenerationItemSummary,
    event: ReactPointerEvent,
  ) {
    if (event.button !== 0 || isNoPaintTarget(event.target)) {
      return;
    }

    // Prevent the checkbox click from also toggling after pointer paint.
    event.preventDefault();

    const paintTo = !effectiveDistributed(item);
    paintSessionRef.current = {
      paintTo,
      touchedIds: new Set([item.invitationId]),
    };
    setIsPainting(true);
    setPaintOverrides(new Map([[item.invitationId, paintTo]]));
  }

  useEffect(() => {
    if (!isPainting) {
      return;
    }

    function handlePointerUp() {
      commitPaint();
    }

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isPainting]);

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table className={cn("table-fixed", isPainting && "select-none")}>
        <TableCaption className="sr-only">
          生成的邀请链接预览。点击行或勾选框可标记已发出，按住拖拽可一次勾选多条。
        </TableCaption>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-36">命名</TableHead>
            <TableHead className="w-14">#</TableHead>
            <TableHead>邀请链接</TableHead>
            <TableHead className="w-40">失效时间</TableHead>
            <TableHead className="w-24 text-center">已发出</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleItems.map((item) => {
            const isPending =
              pendingInvitationIds?.has(item.invitationId) ?? false;
            const isDistributed = effectiveDistributed(item);

            return (
              <TableRow
                key={item.invitationId}
                className={cn(
                  "cursor-pointer",
                  isDistributed && "bg-muted/30",
                )}
                onPointerDown={(event) => {
                  if (isPending) {
                    return;
                  }
                  startPaint(item, event);
                }}
                onPointerEnter={() => {
                  if (isPending || !paintSessionRef.current) {
                    return;
                  }
                  paintItem(item);
                }}
              >
                <TableCell className="max-w-[9rem] truncate text-sm font-medium">
                  {batchName}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs tabular-nums">
                  {item.sequence}
                </TableCell>
                <TableCell className="whitespace-normal">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="min-w-0 flex-1 font-mono text-xs break-all">
                      {item.inviteLink}
                    </span>
                    <CopyLinkButton link={item.inviteLink} />
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">
                  {expiresAtLabel}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={isDistributed}
                      disabled={isPending}
                      className="pointer-events-none"
                      tabIndex={0}
                      aria-label={
                        isDistributed
                          ? `取消标记第 ${item.sequence} 个邀请为已发出`
                          : `标记第 ${item.sequence} 个邀请为已发出`
                      }
                      onKeyDown={(event) => {
                        if (event.key !== " " && event.key !== "Enter") {
                          return;
                        }
                        event.preventDefault();
                        if (isPending || paintSessionRef.current) {
                          return;
                        }
                        onSetDistributed(
                          [item.invitationId],
                          !isDistributed,
                        );
                      }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {hiddenCount > 0 ? (
        <p className="text-muted-foreground border-t px-3 py-2 text-sm">
          当前显示前 {visibleItems.length} 行。下载 Excel 可查看全部{" "}
          {totalCount.toLocaleString("zh-CN")} 个邀请链接。点击或拖拽行可标记已发出。
        </p>
      ) : (
        <p className="text-muted-foreground border-t px-3 py-2 text-sm">
          点击整行或勾选框可标记；按住拖过多行可一次勾选或取消。
        </p>
      )}
    </div>
  );
}
