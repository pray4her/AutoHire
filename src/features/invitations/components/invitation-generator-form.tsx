"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { InviteHashAlgorithm } from "@/lib/auth/token";
import {
  INVITATION_GENERATION_MAX_COUNT,
  INVITATION_GENERATION_MAX_EXPIRED_DAYS,
  INVITATION_GENERATION_SOFT_CONFIRM_COUNT,
} from "@/lib/invitations/constants";
import { RefreshCcw } from "lucide-react";

import {
  ALGORITHM_OPTIONS,
  createDefaultIdempotencyKey,
  isInviteHashAlgorithm,
} from "./invitation-generator-options";

type InvitationGeneratorFormProps = {
  readonly algorithm: InviteHashAlgorithm;
  readonly count: string;
  readonly expiredDays: string;
  readonly expiredHours: string;
  readonly expiredMinutes: string;
  readonly idempotencyKey: string;
  readonly isGenerating: boolean;
  readonly selectedDescription: string;
  readonly advancedOpen: boolean;
  readonly onAdvancedOpenChange: (open: boolean) => void;
  readonly onAlgorithmChange: (algorithm: InviteHashAlgorithm) => void;
  readonly onCountChange: (count: string) => void;
  readonly onExpiredDaysChange: (expiredDays: string) => void;
  readonly onExpiredHoursChange: (expiredHours: string) => void;
  readonly onExpiredMinutesChange: (expiredMinutes: string) => void;
  readonly onIdempotencyKeyChange: (idempotencyKey: string) => void;
  readonly onGenerate: () => void;
};

export function InvitationGeneratorForm({
  algorithm,
  count,
  expiredDays,
  expiredHours,
  expiredMinutes,
  idempotencyKey,
  isGenerating,
  selectedDescription,
  advancedOpen,
  onAdvancedOpenChange,
  onAlgorithmChange,
  onCountChange,
  onExpiredDaysChange,
  onExpiredHoursChange,
  onExpiredMinutesChange,
  onIdempotencyKeyChange,
  onGenerate,
}: InvitationGeneratorFormProps) {
  const daysValue = Number(expiredDays);
  const shortExpiryEnabled = Number.isFinite(daysValue) && daysValue === 0;
  const hoursValue = Number(expiredHours);
  const minutesValue = Number(expiredMinutes);
  const hasMinimumShortExpiry =
    (Number.isFinite(hoursValue) && hoursValue > 0) ||
    (Number.isFinite(minutesValue) && minutesValue > 0);
  const canGenerate =
    !isGenerating &&
    (shortExpiryEnabled ? hasMinimumShortExpiry : daysValue >= 1);

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        onGenerate();
      }}
    >
      <ol className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <li>1. 设置数量与有效期</li>
        <li>2. 生成邀请链接</li>
        <li>3. 下载 Excel 发送</li>
      </ol>

      <div className="grid gap-4 lg:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">数量</span>
          <Input
            min={1}
            max={INVITATION_GENERATION_MAX_COUNT}
            type="number"
            value={count}
            onChange={(event) => onCountChange(event.target.value)}
          />
          <span className="text-muted-foreground text-xs">
            建议单次不超过{" "}
            {INVITATION_GENERATION_SOFT_CONFIRM_COUNT.toLocaleString("zh-CN")}{" "}
            个；上限{" "}
            {INVITATION_GENERATION_MAX_COUNT.toLocaleString("zh-CN")} 个。
          </span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">有效期（天）</span>
          <Input
            min={0}
            max={INVITATION_GENERATION_MAX_EXPIRED_DAYS}
            type="number"
            value={expiredDays}
            onChange={(event) => onExpiredDaysChange(event.target.value)}
          />
          <span className="text-muted-foreground text-xs">
            链接在有效期内可打开报名页。设为 0 后，可在高级设置中填写小时/分钟。
          </span>
        </label>

        <div className="flex items-end">
          <Button className="w-full" disabled={!canGenerate} type="submit">
            {isGenerating ? <Spinner data-icon="inline-start" /> : null}
            {isGenerating ? "正在生成…" : "生成邀请链接"}
          </Button>
        </div>
      </div>

      <Accordion
        className="border-foreground/10 rounded-lg border px-3"
        value={advancedOpen ? ["advanced"] : []}
        onValueChange={(value) => {
          onAdvancedOpenChange(value.includes("advanced"));
        }}
      >
        <AccordionItem value="advanced" className="border-0">
          <AccordionTrigger>高级设置</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4 pt-1 lg:grid-cols-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">哈希算法</span>
                <Select
                  value={algorithm}
                  onValueChange={(value) => {
                    if (
                      typeof value === "string" &&
                      isInviteHashAlgorithm(value)
                    ) {
                      onAlgorithmChange(value);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {ALGORITHM_OPTIONS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground text-xs">
                  {selectedDescription}
                </span>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">有效期（小时）</span>
                <Input
                  min={0}
                  max={23}
                  type="number"
                  value={expiredHours}
                  disabled={!shortExpiryEnabled}
                  onChange={(event) => onExpiredHoursChange(event.target.value)}
                />
                <span className="text-muted-foreground text-xs">
                  仅在有效期天数为 0 时可用。
                </span>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">有效期（分钟）</span>
                <Input
                  min={0}
                  max={59}
                  type="number"
                  value={expiredMinutes}
                  disabled={!shortExpiryEnabled}
                  onChange={(event) =>
                    onExpiredMinutesChange(event.target.value)
                  }
                />
                <span className="text-muted-foreground text-xs">
                  天数为 0 时，总有效期至少 1 分钟。
                </span>
              </label>

              <label className="flex flex-col gap-2 lg:col-span-2">
                <span className="text-sm font-medium">幂等键</span>
                <Input
                  value={idempotencyKey}
                  onChange={(event) =>
                    onIdempotencyKeyChange(event.target.value)
                  }
                />
                <span className="text-muted-foreground text-xs">
                  展开高级设置时将使用此键；重复提交同一键会返回同一批次。
                </span>
              </label>

              <div className="flex items-end">
                <Button
                  className="w-full"
                  type="button"
                  variant="outline"
                  onClick={() =>
                    onIdempotencyKeyChange(createDefaultIdempotencyKey())
                  }
                >
                  <RefreshCcw data-icon="inline-start" />
                  新建幂等键
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </form>
  );
}
