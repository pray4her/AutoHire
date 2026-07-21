"use client";

import { Download, Eye } from "lucide-react";

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
import { formatInvitationDateTime } from "@/lib/invitations/date-format";
import type { InvitationGenerationBatchListItem } from "@/lib/invitations/types";

import { formatDateTime } from "./invitation-generator-options";

type InvitationBatchHistoryCardProps = {
  readonly batches: readonly InvitationGenerationBatchListItem[];
  readonly exportingBatchId: string | null;
  readonly viewingBatchId: string | null;
  readonly isLoading: boolean;
  readonly onExport: (batchId: string) => void;
  readonly onView: (batchId: string) => void;
};

export function InvitationBatchHistoryCard({
  batches,
  exportingBatchId,
  viewingBatchId,
  isLoading,
  onExport,
  onView,
}: InvitationBatchHistoryCardProps) {
  return (
    <Card className="border-foreground/10 bg-background/90 w-full shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle>近期批次</CardTitle>
        <CardDescription>
          可查看明细并标记已发出，或重新下载 Excel。
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
                  <TableHead className="w-40">命名</TableHead>
                  <TableHead>生成时间</TableHead>
                  <TableHead className="w-24">数量</TableHead>
                  <TableHead className="w-40">失效时间</TableHead>
                  <TableHead className="w-52 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => {
                  const isExporting = exportingBatchId === batch.id;
                  const isViewing = viewingBatchId === batch.id;
                  return (
                    <TableRow key={batch.id}>
                      <TableCell className="max-w-[10rem] truncate font-medium">
                        {batch.name.trim() || "未命名"}
                      </TableCell>
                      <TableCell>{formatDateTime(batch.createdAt)}</TableCell>
                      <TableCell>
                        {batch.createdCount.toLocaleString("zh-CN")}
                      </TableCell>
                      <TableCell>
                        {formatInvitationDateTime(batch.expiresAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isViewing || isExporting}
                            onClick={() => onView(batch.id)}
                          >
                            {isViewing ? (
                              <Spinner data-icon="inline-start" />
                            ) : (
                              <Eye data-icon="inline-start" />
                            )}
                            查看
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isExporting || isViewing}
                            onClick={() => onExport(batch.id)}
                          >
                            {isExporting ? (
                              <Spinner data-icon="inline-start" />
                            ) : (
                              <Download data-icon="inline-start" />
                            )}
                            重新下载
                          </Button>
                        </div>
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
