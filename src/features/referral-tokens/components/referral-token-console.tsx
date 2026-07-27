"use client";

import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { DisplayFieldSelector } from "@/features/referral-tokens/components/display-field-selector";
import { ReferralExpertSelector } from "@/features/referral-tokens/components/referral-expert-selector";
import { ReferralTokenActions } from "@/features/referral-tokens/components/referral-token-actions";
import {
  changeReferralToken,
  createReferralToken,
  loadReferralToken,
  regenerateReferralToken,
} from "@/features/referral-tokens/client";
import type {
  GeneratedReferralToken,
  ReferralExpertOption,
  ReferralTokenMetadata,
} from "@/features/referral-tokens/types";
import type { ReferralDisplayField } from "@/lib/referral-tokens/schemas";

type ReferralTokenConsoleProps = {
  readonly initialExperts: readonly ReferralExpertOption[];
};

const REFERRAL_DISPLAY_FIELD_ORDER = [
  "NAME",
  "TITLE",
  "ORGANIZATION",
  "EMAIL",
  "PHONE",
] as const satisfies readonly ReferralDisplayField[];

const DEFAULT_REFERRAL_DISPLAY_FIELDS = [
  "NAME",
  "TITLE",
  "ORGANIZATION",
] as const satisfies readonly ReferralDisplayField[];

export function ReferralTokenConsole(
  props: ReferralTokenConsoleProps,
): React.ReactNode {
  const [selectedFields, setSelectedFields] = useState<
    ReadonlySet<ReferralDisplayField>
  >(() => new Set(DEFAULT_REFERRAL_DISPLAY_FIELDS));
  const [applicationId, setApplicationId] = useState(
    props.initialExperts[0]?.applicationId ?? "",
  );
  const [token, setToken] = useState<ReferralTokenMetadata | null>(null);
  const [generated, setGenerated] = useState<GeneratedReferralToken | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setGenerated(null);
    setToken(null);
    setSelectedFields(new Set(DEFAULT_REFERRAL_DISPLAY_FIELDS));
    setLoadError(null);
    if (!applicationId) {
      return;
    }

    const controller = new AbortController();
    let current = true;
    setBusy(true);
    loadReferralToken(applicationId, controller.signal)
      .then((nextToken) => {
        if (!current) {
          return;
        }
        setToken(nextToken);
        if (nextToken) {
          setSelectedFields(new Set(nextToken.displayFields));
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        const message =
          error instanceof Error ? error.message : "加载推荐 token 失败。";
        if (current) {
          setLoadError(message);
          toast.error(message);
        }
      })
      .finally(() => {
        if (current) {
          setBusy(false);
        }
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [applicationId]);

  function updateDisplayField(
    field: ReferralDisplayField,
    checked: boolean,
  ): void {
    setSelectedFields((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(field);
      } else {
        next.delete(field);
      }
      next.add("NAME");
      return next;
    });
  }

  function selectedFieldList(): readonly ReferralDisplayField[] {
    return REFERRAL_DISPLAY_FIELD_ORDER.filter((field) =>
      selectedFields.has(field),
    );
  }

  async function runGeneration(regenerate: boolean): Promise<void> {
    if (!applicationId) {
      return;
    }
    setBusy(true);
    try {
      const result = regenerate
        ? await regenerateReferralToken(applicationId, selectedFieldList())
        : await createReferralToken(applicationId, selectedFieldList());
      setToken(result.token);
      setGenerated(result);
      toast.success(regenerate ? "推荐链接已重新生成。" : "推荐链接已生成。");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "推荐 token 操作失败。",
      );
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: "DISABLE" | "RENEW"): Promise<void> {
    if (!applicationId) {
      return;
    }
    setBusy(true);
    try {
      const nextToken = await changeReferralToken(applicationId, action);
      setToken(nextToken);
      setGenerated(null);
      toast.success(
        action === "DISABLE"
          ? "推荐 token 已作废。"
          : "推荐 token 已续期 90 天。",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "推荐 token 操作失败。",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyGeneratedLink(): Promise<void> {
    if (!generated) {
      return;
    }
    try {
      await navigator.clipboard.writeText(generated.referralLink);
      toast.success("推荐链接已复制。");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "复制推荐链接失败。",
      );
    }
  }

  return (
    <Card className="overflow-hidden border-slate-300/70 shadow-sm dark:border-slate-700">
      <CardHeader className="border-b bg-slate-950 text-slate-50">
        <div className="flex items-start gap-3">
          <div className="rounded-md border border-white/15 bg-white/10 p-2">
            <Link2 className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-heading text-base leading-snug font-medium">
              推荐链接管理
            </h2>
            <CardDescription className="mt-1 text-slate-300">
              为专家生成可撤销、可续期的公开推荐链接。
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <ReferralExpertSelector
          initialExperts={props.initialExperts}
          value={applicationId}
          disabled={busy}
          onChange={setApplicationId}
        />

        <DisplayFieldSelector
          selected={selectedFields}
          disabled={busy || props.initialExperts.length === 0}
          onChange={updateDisplayField}
        />
        <ReferralTokenActions
          token={token}
          generated={generated}
          busy={busy}
          error={loadError}
          expertSelected={Boolean(applicationId)}
          onGenerate={() => void runGeneration(false)}
          onDisable={() => void runAction("DISABLE")}
          onRenew={() => void runAction("RENEW")}
          onRegenerate={() => void runGeneration(true)}
          onCopy={() => void copyGeneratedLink()}
        />
      </CardContent>
    </Card>
  );
}
