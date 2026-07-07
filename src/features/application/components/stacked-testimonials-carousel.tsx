"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useRef, useState } from "react";

import type { Testimonial } from "@/features/application/components/apply-entry-intro-content";

type StackedTestimonialsCarouselProps = {
  readonly testimonials: readonly Testimonial[];
};

const SWIPE_THRESHOLD_PX = 36;

const STACK_CARD_WIDTH_CLASS = "w-[88%]";

const PREVIEW_CARD_CLASS =
  `pointer-events-auto relative z-0 col-start-1 row-start-1 ml-auto flex min-h-full flex-col ${STACK_CARD_WIDTH_CLASS} translate-y-8 scale-[0.98] rounded-[1.5rem] border border-[color:var(--border)] bg-white/60 p-6 text-left opacity-80 shadow-[0_18px_48px_rgba(15,23,42,0.08)] blur-[1px] saturate-90 transition duration-350 ease-out hover:translate-y-7 hover:opacity-90 motion-reduce:translate-y-8 motion-reduce:transition-none motion-reduce:blur-none sm:p-7`;

const ACTIVE_CARD_CLASS =
  `relative z-10 col-start-1 row-start-1 flex flex-col ${STACK_CARD_WIDTH_CLASS} rounded-[1.65rem] border border-[color:var(--border)] bg-white/95 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.14)] transition duration-350 ease-out motion-reduce:transition-none sm:p-7`;

const CARD_FOOTER_CLASS =
  "mt-6 flex shrink-0 items-center justify-between gap-4 border-t border-[color:var(--border)] pt-4";

function getWrappedIndex(index: number, total: number) {
  return (index + total) % total;
}

function TestimonialCardBody({
  testimonial,
  quoteTestId,
  roleTestId,
  affiliationTestId,
}: {
  readonly testimonial: Testimonial;
  readonly quoteTestId?: string;
  readonly roleTestId?: string;
  readonly affiliationTestId?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--muted)] text-[1.65rem] leading-none text-[color:var(--primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        “
      </span>
      <div className="flex flex-col gap-3">
        <p
          className="text-base leading-7 text-[color:var(--foreground)] sm:text-[1.03rem]"
          data-testid={quoteTestId}
        >
          {testimonial.quote}
        </p>
        <div className="flex flex-col gap-1">
          <p
            className="text-sm font-semibold leading-6 text-[color:var(--primary)]"
            data-testid={roleTestId}
          >
            {testimonial.role}
          </p>
          <p
            className="text-sm leading-6 text-[color:var(--foreground-soft)]"
            data-testid={affiliationTestId}
          >
            {testimonial.affiliation}
          </p>
        </div>
      </div>
    </div>
  );
}

function TestimonialCardFooterPlaceholder() {
  return (
    <div className={CARD_FOOTER_CLASS} aria-hidden>
      <span className="size-10" />
      <span className="size-10" />
    </div>
  );
}

export function StackedTestimonialsCarousel({
  testimonials,
}: StackedTestimonialsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStartRef = useRef<{
    readonly pointerId: number;
    readonly x: number;
    readonly y: number;
  } | null>(null);

  const activeTestimonial = testimonials[activeIndex];
  const previewIndex = getWrappedIndex(activeIndex + 1, testimonials.length);
  const previewTestimonial = testimonials[previewIndex];

  function showPrevious() {
    setActiveIndex((currentIndex) =>
      getWrappedIndex(currentIndex - 1, testimonials.length),
    );
  }

  function showNext() {
    setActiveIndex((currentIndex) =>
      getWrappedIndex(currentIndex + 1, testimonials.length),
    );
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    pointerStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLElement>) {
    const pointerStart = pointerStartRef.current;

    if (!pointerStart || pointerStart.pointerId !== event.pointerId) {
      return;
    }

    pointerStartRef.current = null;
    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;

    if (
      Math.abs(deltaX) < SWIPE_THRESHOLD_PX ||
      Math.abs(deltaX) <= Math.abs(deltaY)
    ) {
      return;
    }

    if (deltaX < 0) {
      showNext();
      return;
    }

    showPrevious();
  }

  return (
    <div
      className="relative pr-6 pb-10"
      data-testid="stacked-testimonials-carousel"
    >
      <div className="relative grid">
        <article
          className={ACTIVE_CARD_CLASS}
          data-testid="active-testimonial-card"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            pointerStartRef.current = null;
          }}
        >
          <TestimonialCardBody
            testimonial={activeTestimonial}
            quoteTestId="active-testimonial-quote"
            roleTestId="active-testimonial-role"
            affiliationTestId="active-testimonial-affiliation"
          />

          <div className={CARD_FOOTER_CLASS}>
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-white text-[color:var(--primary)] transition hover:border-[color:var(--primary)] hover:bg-[color:var(--muted)] motion-reduce:transition-none"
              onClick={showPrevious}
              aria-label="Show previous testimonial"
              data-testid="previous-testimonial-button"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-white text-[color:var(--primary)] transition hover:border-[color:var(--primary)] hover:bg-[color:var(--muted)] motion-reduce:transition-none"
              onClick={showNext}
              aria-label="Show next testimonial"
              data-testid="next-testimonial-button"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        </article>

        <button
          type="button"
          className={PREVIEW_CARD_CLASS}
          onClick={showNext}
          aria-label={`Show testimonial from ${previewTestimonial.role}`}
          data-testid="background-testimonial-trigger"
        >
          <TestimonialCardBody testimonial={previewTestimonial} />
          <TestimonialCardFooterPlaceholder />
        </button>
      </div>
    </div>
  );
}
