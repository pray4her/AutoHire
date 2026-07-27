"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { searchReferralExperts } from "@/features/referral-tokens/client";
import type { ReferralExpertOption } from "@/features/referral-tokens/types";

type ReferralExpertSelectorProps = {
  readonly initialExperts: readonly ReferralExpertOption[];
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (applicationId: string) => void;
};

function mergeExperts(
  current: readonly ReferralExpertOption[],
  found: readonly ReferralExpertOption[],
): readonly ReferralExpertOption[] {
  const byApplication = new Map(
    current.map((expert) => [expert.applicationId, expert]),
  );
  for (const expert of found) {
    byApplication.set(expert.applicationId, expert);
  }
  return [...byApplication.values()];
}

export function ReferralExpertSelector(
  props: ReferralExpertSelectorProps,
): React.ReactNode {
  const [query, setQuery] = useState("");
  const [experts, setExperts] = useState(props.initialExperts);
  const [searching, setSearching] = useState(false);

  async function search(): Promise<void> {
    setSearching(true);
    try {
      const found = await searchReferralExperts(query);
      setExperts((current) => mergeExperts(current, found));
      if (found.length === 0) {
        toast.info("未找到匹配的专家档案。");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "搜索专家失败。");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="grid gap-3">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <Input
          type="search"
          aria-label="搜索专家"
          placeholder="按姓名、邮箱或客户编号搜索"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="submit" variant="outline" disabled={searching}>
          {searching ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Search data-icon="inline-start" />
          )}
          查找专家
        </Button>
      </form>
      <div className="grid gap-2">
        <label htmlFor="referral-expert" className="text-sm font-medium">
          专家档案
        </label>
        <select
          id="referral-expert"
          className="bg-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
          value={props.value}
          disabled={props.disabled}
          onChange={(event) => props.onChange(event.target.value)}
        >
          <option value="">
            {experts.length === 0 ? "暂无可管理的专家档案" : "请选择专家档案"}
          </option>
          {experts.map((expert) => (
            <option key={expert.applicationId} value={expert.applicationId}>
              {expert.name ?? "未命名专家"} · {expert.customerNo}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
