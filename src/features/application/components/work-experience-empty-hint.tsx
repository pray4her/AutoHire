import {
  WORK_EXPERIENCE_EMPTY_HINT_EXAMPLE_SEGMENTS,
  WORK_EXPERIENCE_EMPTY_HINT_INTRO,
} from "@/features/analysis/initial-cv-review-extract";
import { cn } from "@/lib/utils";

export function WorkExperienceEmptyHint({
  className,
}: {
  className?: string;
}) {
  return (
    <span className={cn("text-sm text-[color:var(--muted-foreground)]", className)}>
      <span className="block">{WORK_EXPERIENCE_EMPTY_HINT_INTRO}</span>
      <span className="mt-1 block leading-relaxed">
        <strong className="font-semibold text-[color:var(--foreground-soft)]">
          Example:
        </strong>{" "}
        {WORK_EXPERIENCE_EMPTY_HINT_EXAMPLE_SEGMENTS.map((segment, index) => (
          <span key={segment} className="whitespace-nowrap">
            {index > 0 ? " |" : ""}
            {segment}
          </span>
        ))}
      </span>
    </span>
  );
}
