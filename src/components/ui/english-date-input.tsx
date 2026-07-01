"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type EnglishDateInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "lang"
> & {
  isEmpty?: boolean;
};

/**
 * Native date inputs follow the OS locale for segment labels, which on zh-CN
 * systems can show mixed text such as "yyyy-mm-日". Force English segments and
 * overlay a consistent placeholder when empty.
 */
const EnglishDateInput = React.forwardRef<
  HTMLInputElement,
  EnglishDateInputProps
>(function EnglishDateInput(
  { className, isEmpty = false, onFocus, onBlur, ...props },
  ref,
) {
  const [focused, setFocused] = React.useState(false);
  const showPlaceholder = isEmpty && !focused;

  return (
    <div className="relative">
      <input
        ref={ref}
        type="date"
        lang="en-US"
        className={cn(
          className,
          showPlaceholder && "[&::-webkit-datetime-edit]:opacity-0",
        )}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...props}
      />
      {showPlaceholder ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400"
        >
          YYYY-MM-DD
        </span>
      ) : null}
    </div>
  );
});

export { EnglishDateInput };
