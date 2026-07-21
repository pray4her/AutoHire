import { Download } from "lucide-react";

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
import { Spinner } from "@/components/ui/spinner";
import { formatInvitationDateTime } from "@/lib/invitations/date-format";
import type { InvitationGenerationBatchSummary } from "@/lib/invitations/types";

import { formatDateTime } from "./invitation-generator-options";
import { InvitationPreviewRows } from "./invitation-preview-rows";

type InvitationBatchResultCardProps = {
  readonly batch: InvitationGenerationBatchSummary;
  readonly isExporting: boolean;
  readonly pendingInvitationIds?: ReadonlySet<string> | null;
  readonly onExport: () => void;
  readonly onSetDistributed: (
    invitationIds: readonly string[],
    distributed: boolean,
  ) => void;
};

export function InvitationBatchResultCard({
  batch,
  isExporting,
  pendingInvitationIds = null,
  onExport,
  onSetDistributed,
}: InvitationBatchResultCardProps) {
  const batchName = batch.name.trim() || "未命名";

  return (
    <Card className="border-foreground/10 bg-background/90 w-full shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle>邀请链接已就绪</CardTitle>
        <CardDescription>
          已生成 {batch.createdCount.toLocaleString("zh-CN")}{" "}
          个链接（{formatDateTime(batch.createdAt)}
          ）。请下载 Excel，用「邀请链接」列发给专家。点击行或勾选框标记「已发出」，按住拖拽可一次勾选多条，可随时取消。
        </CardDescription>
        <CardAction>
          <Button size="lg" disabled={isExporting} onClick={onExport}>
            {isExporting ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Download data-icon="inline-start" />
            )}
            下载 Excel
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">命名：{batchName}</Badge>
          <Badge variant="outline">
            数量：{batch.createdCount.toLocaleString("zh-CN")}
          </Badge>
          <Badge variant="outline">
            失效时间：{formatInvitationDateTime(batch.expiresAt)}
          </Badge>
          <Badge variant="outline">
            生成时间：{formatDateTime(batch.createdAt)}
          </Badge>
        </div>

        <InvitationPreviewRows
          batchName={batchName}
          expiresAt={batch.expiresAt}
          items={batch.items}
          totalCount={batch.createdCount}
          pendingInvitationIds={pendingInvitationIds}
          onSetDistributed={onSetDistributed}
        />
      </CardContent>
    </Card>
  );
}
