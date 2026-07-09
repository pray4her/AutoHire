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
import { formatInvitationExpiryLabel } from "@/lib/invitations/expiry-label";
import type { InvitationGenerationBatchSummary } from "@/lib/invitations/types";

import { formatDateTime } from "./invitation-generator-options";
import { InvitationPreviewRows } from "./invitation-preview-rows";

type InvitationBatchResultCardProps = {
  readonly batch: InvitationGenerationBatchSummary;
  readonly isExporting: boolean;
  readonly onExport: () => void;
};

export function InvitationBatchResultCard({
  batch,
  isExporting,
  onExport,
}: InvitationBatchResultCardProps) {
  return (
    <Card className="border-foreground/10 bg-background/90 w-full shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle>Generated batch</CardTitle>
        <CardDescription>
          {batch.createdCount} tokens generated for {batch.hashAlgorithm} at{" "}
          {formatDateTime(batch.createdAt)}.
        </CardDescription>
        <CardAction>
          <Button disabled={isExporting} onClick={onExport}>
            {isExporting ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Download data-icon="inline-start" />
            )}
            Export Excel
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Batch: {batch.id}</Badge>
          <Badge variant="outline">Key: {batch.idempotencyKey}</Badge>
          <Badge variant="outline">Count: {batch.createdCount}</Badge>
          <Badge variant="outline">
            Expiry: {formatInvitationExpiryLabel(batch)}
          </Badge>
        </div>
        <InvitationPreviewRows items={batch.items} />
      </CardContent>
    </Card>
  );
}
