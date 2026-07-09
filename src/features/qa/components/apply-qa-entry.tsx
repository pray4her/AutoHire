"use client";

import { useDeferredValue, useRef, useState } from "react";
import { CircleHelp, SearchIcon, XIcon } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { QaFaqEntry } from "@/features/qa/types";

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
  const [openItems, setOpenItems] = useState<string[]>([]);
  const deferredQuery = useDeferredValue(query);
  const filteredEntries = filterQaFaqEntries(initialEntries, deferredQuery);
  const hasEntries = initialEntries.length > 0;
  const hasActiveQuery = query.trim().length > 0;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function resetPanelState() {
    setQuery("");
    setOpenItems([]);
  }

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="lg"
        aria-label="Open application help"
        className="fixed right-4 bottom-4 z-40 h-14 gap-2 rounded-full border-border/80 bg-background/90 px-4 font-semibold text-foreground shadow-[var(--shadow-soft)] backdrop-blur-md hover:border-accent/40 hover:bg-background hover:text-foreground md:right-6 md:bottom-6"
        onClick={() => setOpen(true)}
      >
        <CircleHelp data-icon="inline-start" className="text-accent" />
        <span>Q&A</span>
      </Button>

      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            resetPanelState();
          }

          setOpen(nextOpen);
        }}
      >
        <SheetContent
          side="right"
          initialFocus={searchInputRef}
          finalFocus={triggerRef}
          className="gap-0 overflow-hidden border-l border-border/80 bg-card p-0 data-[side=right]:w-full data-[side=right]:max-w-full sm:data-[side=right]:w-[28rem] sm:data-[side=right]:max-w-[28rem]"
        >
          <SheetHeader className="gap-1.5 border-b border-border/80 bg-card px-4 py-4">
            <SheetTitle className="pr-8 text-base font-semibold text-foreground">
              Application help
            </SheetTitle>
            <SheetDescription>
              Answers to common questions about the application process.
            </SheetDescription>
          </SheetHeader>

          <div className="border-b border-border/70 px-4 py-3">
            <InputGroup className="h-10 rounded-xl bg-background">
              <InputGroupInput
                ref={searchInputRef}
                type="search"
                role="searchbox"
                aria-label="Search frequently asked questions"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search questions, answers, or keywords"
                className="h-10 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
              />
              <InputGroupAddon align="inline-start">
                <SearchIcon aria-hidden />
              </InputGroupAddon>
              {hasActiveQuery ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Clear search query"
                    onClick={() => {
                      setQuery("");
                      searchInputRef.current?.focus();
                    }}
                  >
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
            {hasEntries && hasActiveQuery ? (
              <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
                {filteredEntries.length === 1
                  ? "1 matching question"
                  : `${filteredEntries.length} matching questions`}
              </p>
            ) : null}
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="px-2 py-2">
              {!hasEntries ? (
                <div className="px-2 py-2">
                  <Empty className="border border-dashed border-border bg-muted/30">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <CircleHelp />
                      </EmptyMedia>
                      <EmptyTitle>Help topics aren’t available yet</EmptyTitle>
                      <EmptyDescription>
                        Contact the program team if you need support with your
                        application.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="px-2 py-2">
                  <Empty className="border border-dashed border-border bg-muted/30">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <SearchIcon />
                      </EmptyMedia>
                      <EmptyTitle>No matching results</EmptyTitle>
                      <EmptyDescription>
                        Try a different keyword, or clear your search to view all
                        questions.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setQuery("");
                          searchInputRef.current?.focus();
                        }}
                      >
                        Clear search
                      </Button>
                    </EmptyContent>
                  </Empty>
                </div>
              ) : (
                <Accordion
                  multiple
                  value={openItems}
                  onValueChange={setOpenItems}
                  className="px-2"
                >
                  {filteredEntries.map((entry) => (
                    <AccordionItem
                      key={entry.id}
                      value={entry.id}
                      className="border-border/80"
                    >
                      <AccordionTrigger className="px-2 py-4 hover:bg-muted/60 hover:no-underline">
                        <span className="pr-2 text-sm font-medium leading-6 text-foreground">
                          {entry.question}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="px-2 text-muted-foreground">
                        <p className="leading-7 whitespace-pre-wrap">
                          {entry.answer}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
