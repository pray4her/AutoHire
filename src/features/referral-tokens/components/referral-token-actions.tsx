import { Copy, RefreshCw, RotateCw, ShieldOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type {
  GeneratedReferralToken,
  ReferralTokenMetadata,
} from "@/features/referral-tokens/types";

type ReferralTokenActionsProps = {
  readonly token: ReferralTokenMetadata | null;
  readonly generated: GeneratedReferralToken | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly expertSelected: boolean;
  readonly onGenerate: () => void;
  readonly onDisable: () => void;
  readonly onRenew: () => void;
  readonly onRegenerate: () => void;
  readonly onCopy: () => void;
};

function formatExpiry(value: string): string {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

export function ReferralTokenActions({
  token,
  generated,
  busy,
  error,
  expertSelected,
  onGenerate,
  onDisable,
  onRenew,
  onRegenerate,
  onCopy,
}: ReferralTokenActionsProps) {
  const statusLabel =
    token?.status === "DISABLED"
      ? "已作废"
      : token?.status === "EXPIRED"
        ? "已过期"
        : "有效";

  return (
    <div className="space-y-4 border-t pt-4">
      {busy ? (
        <p
          className="text-muted-foreground flex items-center gap-2 text-sm"
          aria-live="polite"
        >
          <Spinner />
          正在加载推荐 token…
        </p>
      ) : null}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {token ? (
        <div className="bg-muted/45 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-3 py-2.5">
          <Badge variant={token.status === "ACTIVE" ? "default" : "secondary"}>
            {statusLabel}
          </Badge>
          <span className="text-muted-foreground text-sm">
            失效时间：{formatExpiry(token.expiredAt)}
          </span>
        </div>
      ) : !busy && expertSelected ? (
        <p className="text-muted-foreground text-sm">
          该专家尚未生成推荐 token。
        </p>
      ) : !expertSelected ? (
        <p className="text-muted-foreground text-sm">暂无可管理的专家档案。</p>
      ) : null}

      {generated ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/25">
          <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">
            链接与明文 token 仅在本次生成后展示一次
          </p>
          <p className="mt-2 font-mono text-sm break-all text-emerald-950 dark:text-emerald-50">
            {generated.referralLink}
          </p>
          <Button className="mt-3" size="sm" variant="outline" onClick={onCopy}>
            <Copy data-icon="inline-start" />
            复制链接
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!token ? (
          <Button disabled={busy || !expertSelected} onClick={onGenerate}>
            {busy ? <Spinner data-icon="inline-start" /> : null}
            生成推荐链接
          </Button>
        ) : null}
        {token?.status === "ACTIVE" || token?.status === "EXPIRED" ? (
          <>
            <Button variant="outline" disabled={busy} onClick={onRenew}>
              <RefreshCw data-icon="inline-start" />
              续期 90 天
            </Button>
            <Button variant="outline" disabled={busy} onClick={onRegenerate}>
              <RotateCw data-icon="inline-start" />
              重新生成
            </Button>
            <Button variant="destructive" disabled={busy} onClick={onDisable}>
              <ShieldOff data-icon="inline-start" />
              作废
            </Button>
          </>
        ) : null}
        {token?.status === "DISABLED" ? (
          <Button disabled={busy} onClick={onRegenerate}>
            <RotateCw data-icon="inline-start" />
            重新生成
          </Button>
        ) : null}
      </div>
    </div>
  );
}
