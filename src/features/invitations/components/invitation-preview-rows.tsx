"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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

function CopyTokenButton({ token }: { readonly token: string }) {
  const [copied, setCopied] = useState(false);

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success("Token copied.");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy token.");
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
            aria-label="Copy token"
            onClick={() => void copyToken()}
          />
        }
      >
        {copied ? <Check /> : <Copy />}
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied" : "Copy token"}</TooltipContent>
    </Tooltip>
  );
}

export function InvitationPreviewRows({
  items,
}: {
  readonly items: readonly InvitationGenerationItemSummary[];
}) {
  const visibleItems = items.slice(0, 8);
  const hiddenCount = Math.max(items.length - visibleItems.length, 0);

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table className="table-fixed">
        <TableCaption className="sr-only">
          Preview of generated invitation tokens
        </TableCaption>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-14">#</TableHead>
            <TableHead className="w-[18%]">Expert ID</TableHead>
            <TableHead className="w-[42%]">Token</TableHead>
            <TableHead>Link</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleItems.map((item) => (
            <TableRow key={item.invitationId}>
              <TableCell className="text-muted-foreground font-mono text-xs tabular-nums">
                {item.sequence}
              </TableCell>
              <TableCell className="font-mono text-xs break-all whitespace-normal">
                {item.expertId}
              </TableCell>
              <TableCell className="whitespace-normal">
                <div className="flex min-w-0 items-start gap-2">
                  <span className="min-w-0 flex-1 font-mono text-xs break-all">
                    {item.plaintextToken}
                  </span>
                  <CopyTokenButton token={item.plaintextToken} />
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs break-all whitespace-normal">
                {item.inviteLink}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hiddenCount > 0 ? (
        <p className="text-muted-foreground border-t px-3 py-2 text-sm">
          Showing first {visibleItems.length} rows. Export Excel for all{" "}
          {items.length} tokens.
        </p>
      ) : null}
    </div>
  );
}
