"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useRef, useState } from "react";

import type { Testimonial } from "@/features/application/components/apply-entry-intro-content";

type StackedTestimonialsCarouselProps = {
  readonly testimonials: readonly Testimonial[];
};

type SlideDirection = 1 | -1;

const SWIPE_THRESHOLD_PX = 36;
const SLIDE_OFFSET_PX = 28;

const STACK_CARD_WIDTH_CLASS = "w-[88%]";

const PREVIEW_CARD_CLASS = `pointer-events-auto relative z-0 col-start-1 row-start-1 ml-auto flex min-h-full flex-col self-stretch ${STACK_CARD_WIDTH_CLASS} rounded-[1.5rem] border border-[color:var(--border)] bg-white/60 p-6 text-left shadow-[0_18px_48px_rgba(15,23,42,0.08)] blur-[1px] saturate-90 motion-reduce:blur-none sm:p-7`;

const ACTIVE_CARD_CLASS = `flex flex-col ${STACK_CARD_WIDTH_CLASS} rounded-[1.65rem] border border-[color:var(--border)] bg-white/95 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.14)] sm:p-7`;

const CARD_FOOTER_CLASS =
  "mt-6 flex shrink-0 items-center justify-between gap-4 border-t border-[color:var(--border)] pt-4";

const CARD_TRANSITION = {
  duration: 0.32,
  ease: [0.22, 1, 0.36, 1] as const,
};

const PREVIEW_CONTENT_TRANSITION = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1] as const,
};

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

function ActiveCardLayoutAnchor({
  testimonial,
}: {
  readonly testimonial: Testimonial;
}) {
  return (
    <div className="invisible" aria-hidden="true">
      <article className={ACTIVE_CARD_CLASS}>
        <TestimonialCardBody testimonial={testimonial} />
        <TestimonialCardFooterPlaceholder />
      </article>
    </div>
  );
}

function getActiveCardVariants(shouldReduceMotion: boolean) {
  if (shouldReduceMotion) {
    return {
      enter: { opacity: 1, x: 0, scale: 1 },
      center: { opacity: 1, x: 0, scale: 1 },
      exit: { opacity: 1, x: 0, scale: 1 },
    };
  }

  return {
    enter: (direction: SlideDirection) => ({
      opacity: 0,
      x: direction * SLIDE_OFFSET_PX,
      scale: direction > 0 ? 0.985 : 1,
    }),
    center: {
      opacity: 1,
      x: 0,
      scale: 1,
    },
    exit: (direction: SlideDirection) => ({
      opacity: 0,
      x: direction * -SLIDE_OFFSET_PX,
      scale: direction > 0 ? 1 : 0.985,
    }),
  };
}

export function StackedTestimonialsCarousel({
  testimonials,
}: StackedTestimonialsCarouselProps) {
  const shouldReduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<SlideDirection>(1);
  const pointerStartRef = useRef<{
    readonly pointerId: number;
    readonly x: number;
    readonly y: number;
  } | null>(null);

  const activeTestimonial = testimonials[activeIndex];
  const previewIndex = getWrappedIndex(activeIndex + 1, testimonials.length);
  const previewTestimonial = testimonials[previewIndex];
  const activeCardVariants = getActiveCardVariants(shouldReduceMotion);
  const cardTransition = shouldReduceMotion
    ? { duration: 0 }
    : CARD_TRANSITION;
  const previewContentTransition = shouldReduceMotion
    ? { duration: 0 }
    : PREVIEW_CONTENT_TRANSITION;

  function showPrevious() {
    setDirection(-1);
    setActiveIndex((currentIndex) =>
      getWrappedIndex(currentIndex - 1, testimonials.length),
    );
  }

  function showNext() {
    setDirection(1);
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
        <div
          className={`relative z-10 col-start-1 row-start-1 pointer-events-none ${STACK_CARD_WIDTH_CLASS}`}
        >
          <ActiveCardLayoutAnchor testimonial={activeTestimonial} />

          <div
            className="absolute inset-0"
            data-testid="active-testimonial-card"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              pointerStartRef.current = null;
            }}
          >
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.article
                key={activeTestimonial.id}
                custom={direction}
                variants={activeCardVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={cardTransition}
                className={`${ACTIVE_CARD_CLASS} pointer-events-auto`}
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
              </motion.article>
            </AnimatePresence>
          </div>
        </div>

        <motion.button
          type="button"
          className={PREVIEW_CARD_CLASS}
          onClick={showNext}
          aria-label={`Show testimonial from ${previewTestimonial.role}`}
          data-testid="background-testimonial-trigger"
          animate={{ y: 32, scale: 0.98, opacity: 0.8 }}
          whileHover={
            shouldReduceMotion
              ? undefined
              : { y: 28, opacity: 0.9, scale: 0.985 }
          }
          transition={cardTransition}
        >
          <div className="relative flex-1">
            <div className="invisible" aria-hidden="true">
              <TestimonialCardBody testimonial={previewTestimonial} />
            </div>
            <motion.div
              key={previewTestimonial.id}
              className="absolute inset-0 flex flex-col"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={previewContentTransition}
            >
              <TestimonialCardBody testimonial={previewTestimonial} />
            </motion.div>
          </div>
          <TestimonialCardFooterPlaceholder />
        </motion.button>
      </div>
    </div>
  );
}
