import { RefreshCcw } from "lucide-react";

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
import { INVITATION_GENERATION_MAX_COUNT } from "@/lib/invitations/constants";

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
      className="grid gap-4 lg:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        onGenerate();
      }}
    >
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">哈希算法</span>
        <Select
          value={algorithm}
          onValueChange={(value) => {
            if (typeof value === "string" && isInviteHashAlgorithm(value)) {
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
        <span className="text-sm font-medium">数量</span>
        <Input
          min={1}
          max={INVITATION_GENERATION_MAX_COUNT}
          type="number"
          value={count}
          onChange={(event) => onCountChange(event.target.value)}
        />
        <span className="text-muted-foreground text-xs">
          每批最多 {INVITATION_GENERATION_MAX_COUNT.toLocaleString("zh-CN")}{" "}
          个。
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">有效期（天）</span>
        <Input
          min={0}
          max={3650}
          type="number"
          value={expiredDays}
          onChange={(event) => onExpiredDaysChange(event.target.value)}
        />
        <span className="text-muted-foreground text-xs">
          默认 90 天。设为 0 后可使用小时/分钟。
        </span>
      </label>

      <div className="flex items-end gap-2">
        <Button className="w-full" disabled={!canGenerate} type="submit">
          {isGenerating ? <Spinner data-icon="inline-start" /> : null}
          生成
        </Button>
      </div>

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
          0–23。仅在天数为 0 时启用。
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
          onChange={(event) => onExpiredMinutesChange(event.target.value)}
        />
        <span className="text-muted-foreground text-xs">
          0–59。天数为 0 时，总有效期至少为 1 分钟。
        </span>
      </label>

      <label className="flex flex-col gap-2 lg:col-span-2">
        <span className="text-sm font-medium">幂等键</span>
        <Input
          value={idempotencyKey}
          onChange={(event) => onIdempotencyKeyChange(event.target.value)}
        />
        <span className="text-muted-foreground text-xs">
          重复使用此键会返回同一批次，而不会创建新令牌。
        </span>
      </label>

      <div className="flex items-end lg:col-span-4">
        <Button
          className="w-full sm:w-auto"
          type="button"
          variant="outline"
          onClick={() => onIdempotencyKeyChange(createDefaultIdempotencyKey())}
        >
          <RefreshCcw data-icon="inline-start" />
          新建幂等键
        </Button>
      </div>
    </form>
  );
}
