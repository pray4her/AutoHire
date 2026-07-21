"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatInvitationExpiryLabel } from "@/lib/invitations/expiry-label";
import type { InvitationGenerationBatchListItem } from "@/lib/invitations/types";

import { formatDateTime } from "./invitation-generator-options";

type InvitationBatchHistoryCardProps = {
  readonly batches: readonly InvitationGenerationBatchListItem[];
  readonly exportingBatchId: string | null;
  readonly isLoading: boolean;
  readonly onExport: (batchId: string) => void;
};

export function InvitationBatchHistoryCard({
  batches,
  exportingBatchId,
  isLoading,
  onExport,
}: InvitationBatchHistoryCardProps) {
  return (
    <Card className="border-foreground/10 bg-background/90 w-full shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle>近期批次</CardTitle>
        <CardDescription>
          可重新下载此前生成的 Excel，无需再次生成。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Spinner />
            正在加载近期批次…
          </div>
        ) : batches.length === 0 ? (
          <p className="text-muted-foreground text-sm">暂无生成记录。</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>生成时间</TableHead>
                  <TableHead className="w-28">数量</TableHead>
                  <TableHead className="w-32">有效期</TableHead>
                  <TableHead className="w-36 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => {
                  const isExporting = exportingBatchId === batch.id;
                  return (
                    <TableRow key={batch.id}>
                      <TableCell>{formatDateTime(batch.createdAt)}</TableCell>
                      <TableCell>
                        {batch.createdCount.toLocaleString("zh-CN")}
                      </TableCell>
                      <TableCell>
                        {formatInvitationExpiryLabel(batch)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isExporting}
                          onClick={() => onExport(batch.id)}
                        >
                          {isExporting ? (
                            <Spinner data-icon="inline-start" />
                          ) : (
                            <Download data-icon="inline-start" />
                          )}
                          重新下载
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
