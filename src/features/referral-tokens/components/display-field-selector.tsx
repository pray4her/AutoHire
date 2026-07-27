import { AlertTriangle } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import type { ReferralDisplayField } from "@/lib/referral-tokens/schemas";

const DISPLAY_FIELD_OPTIONS = [
  { value: "NAME", label: "姓名", description: "识别推荐专家的基本信息" },
  { value: "TITLE", label: "头衔", description: "当前专业职务或称谓" },
  { value: "ORGANIZATION", label: "机构", description: "当前所在机构" },
  { value: "EMAIL", label: "邮箱", description: "联系方式，默认不公开" },
  { value: "PHONE", label: "电话", description: "联系方式，默认不公开" },
] as const satisfies readonly {
  readonly value: ReferralDisplayField;
  readonly label: string;
  readonly description: string;
}[];

type DisplayFieldSelectorProps = {
  readonly selected: ReadonlySet<ReferralDisplayField>;
  readonly disabled: boolean;
  readonly onChange: (field: ReferralDisplayField, checked: boolean) => void;
};

export function DisplayFieldSelector({
  selected,
  disabled,
  onChange,
}: DisplayFieldSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-lg border border-amber-300/80 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">
            该页面对任何拿到链接的人公开可见
          </p>
          <p className="mt-1 text-xs leading-5 opacity-80">
            仅勾选专家同意公开的信息。邮箱与电话默认关闭。
          </p>
        </div>
      </div>

      <fieldset
        disabled={disabled}
        className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5"
      >
        <legend className="mb-2 text-sm font-medium sm:col-span-2 xl:col-span-5">
          落地页展示字段
        </legend>
        {DISPLAY_FIELD_OPTIONS.map((option) => (
          <div
            key={option.value}
            className="bg-background hover:bg-muted/40 flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors has-disabled:opacity-70"
          >
            <Checkbox
              id={`referral-display-${option.value.toLowerCase()}`}
              checked={selected.has(option.value)}
              disabled={disabled || option.value === "NAME"}
              onCheckedChange={(checked) =>
                onChange(option.value, checked === true)
              }
              aria-label={option.label}
            />
            <div className="grid gap-0.5">
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor={`referral-display-${option.value.toLowerCase()}`}
                  className={
                    option.value === "NAME"
                      ? "cursor-not-allowed text-sm font-medium"
                      : "cursor-pointer text-sm font-medium"
                  }
                >
                  {option.label}
                </label>
                {option.value === "NAME" ? (
                  <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium">
                    必选
                  </span>
                ) : null}
              </div>
              <span className="text-muted-foreground text-xs">
                {option.description}
              </span>
            </div>
          </div>
        ))}
      </fieldset>
    </div>
  );
}
