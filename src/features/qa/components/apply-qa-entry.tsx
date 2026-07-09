"use client";

import { useDeferredValue, useState } from "react";
import { ChevronDown, CircleHelp, SearchCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { QaFaqEntry } from "@/features/qa/types";
import { cn } from "@/lib/utils";

export function filterQaFaqEntries(
  entries: readonly QaFaqEntry[],
  query: string,
): readonly QaFaqEntry[] {
  const normalizedTokens = normalizeSearchText(query)
    .split(" ")
    .filter((token) => token.length > 0);

  if (normalizedTokens.length === 0) {
    return entries;
  }

  return entries.filter((entry) => {
    const haystack = normalizeSearchText(
      [entry.question, entry.answer, ...entry.keywords].join(" "),
    );

    return normalizedTokens.every((token) => haystack.includes(token));
  });
}

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export function ApplyQaEntry({
  initialEntries,
}: {
  initialEntries: readonly QaFaqEntry[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const filteredEntries = filterQaFaqEntries(initialEntries, deferredQuery);
  const hasEntries = initialEntries.length > 0;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="fixed right-4 bottom-4 z-40 h-14 gap-2 overflow-visible rounded-full border border-white/75 bg-white/88 px-4 text-sm font-semibold text-slate-950 shadow-[0_22px_55px_rgba(15,23,42,0.16),0_8px_22px_rgba(16,185,129,0.10),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl hover:border-emerald-100 hover:bg-white hover:shadow-[0_26px_65px_rgba(15,23,42,0.18),0_10px_30px_rgba(16,185,129,0.14),inset_0_1px_0_rgba(255,255,255,1)] focus-visible:ring-emerald-500/30 md:right-6 md:bottom-6"
        onClick={() => setOpen(true)}
      >
        <span
          className="pointer-events-none absolute inset-[-3px] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.18),rgba(16,185,129,0)_70%)]"
          aria-hidden
        />
        <CircleHelp
          data-icon="inline-start"
          className="relative size-5 text-emerald-700"
          aria-hidden
        />
        <span className="relative">Q&A</span>
      </Button>

      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setQuery("");
          }

          setOpen(nextOpen);
        }}
      >
        <SheetContent
          side="right"
          className="gap-0 overflow-hidden border-l border-slate-200/80 bg-card p-0 data-[side=right]:w-full data-[side=right]:max-w-full sm:data-[side=right]:w-[28rem] sm:data-[side=right]:max-w-[28rem]"
        >
          <SheetHeader className="border-border/80 gap-3 border-b bg-card px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <SheetTitle className="pr-8 text-base font-semibold text-slate-950">
              General Inquiries
            </SheetTitle>
          </SheetHeader>

          <div className="border-border/70 border-b px-4 py-3">
            <div className="relative">
              <SearchCheckIcon
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <Input
                type="search"
                role="searchbox"
                aria-label="Search frequently asked questions"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search questions, answers, or keywords"
                className="h-10 rounded-xl border-slate-200 bg-white pl-10 shadow-none focus-visible:ring-emerald-500/20"
              />
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="py-2">
              {!hasEntries ? (
                <div className="px-4 py-2">
                  <QaEmptyState
                    title="No FAQs configured yet"
                    description="FAQ content will appear here once it has been added to the database."
                  />
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="px-4 py-2">
                  <QaEmptyState
                    title="No matching results"
                    description="Try a different keyword, or clear your search to view all questions."
                  />
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {filteredEntries.map((entry) => (
                    <QaFaqAccordionItem key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

function QaFaqAccordionItem({ entry }: { entry: QaFaqEntry }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = `qa-faq-panel-${entry.id}`;
  const triggerId = `qa-faq-trigger-${entry.id}`;

  return (
    <div>
      <button
        type="button"
        id={triggerId}
        className="grid w-full grid-cols-[minmax(0,1fr)_2rem] items-start gap-3 px-4 py-4 text-left transition hover:bg-slate-50"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="min-w-0 text-sm font-medium leading-6 text-slate-950">
          {entry.question}
        </span>
        <span
          className="flex size-8 items-center justify-center self-start"
          aria-hidden
        >
          <ChevronDown
            className={cn(
              "size-5 text-slate-400 transition-transform duration-200 ease-out motion-reduce:transition-none",
              isOpen ? "rotate-180 text-slate-700" : "",
            )}
          />
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        aria-hidden={!isOpen}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden" inert={!isOpen ? true : undefined}>
          <div className="border-t border-slate-200 px-4 pt-3 pb-4">
            <p className="text-sm leading-7 whitespace-pre-wrap text-slate-600">
              {entry.answer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QaEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-10 text-center shadow-[0_10px_30px_rgba(15,23,42,0.03)]">
      <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
        <CircleHelp className="size-5" aria-hidden />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
