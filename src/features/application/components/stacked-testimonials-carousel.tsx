"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useRef, useState } from "react";

import { ApplyEntryTestimonialImage } from "@/features/application/components/apply-entry-testimonial-image";
import type { Testimonial } from "@/features/application/components/apply-entry-intro-content";

type StackedTestimonialsCarouselProps = {
  readonly testimonials: readonly Testimonial[];
};

type SlideDirection = 1 | -1;

const SWIPE_THRESHOLD_PX = 36;
const SLIDE_OFFSET_PX = 28;

const STACK_CARD_WIDTH_CLASS = "w-[88%]";

const PREVIEW_CARD_CLASS = `pointer-events-auto relative z-0 col-start-1 row-start-1 ml-auto flex flex-col self-start ${STACK_CARD_WIDTH_CLASS} overflow-hidden rounded-[1.5rem] border border-[color:var(--border)] bg-white/60 text-left shadow-[0_18px_48px_rgba(15,23,42,0.08)] blur-[1px] saturate-90 motion-reduce:blur-none`;

const ACTIVE_CARD_CLASS = `flex flex-col overflow-hidden ${STACK_CARD_WIDTH_CLASS} rounded-[1.65rem] border border-[color:var(--border)] bg-white/95 shadow-[0_24px_64px_rgba(15,23,42,0.14)]`;

const CARD_FOOTER_CLASS =
  "flex shrink-0 items-center justify-between gap-4 border-t border-[color:var(--border)] px-3 py-4 sm:px-4";

const CARD_TRANSITION = {
  duration: 0.32,
  ease: [0.22, 1, 0.36, 1] as const,
};

function getWrappedIndex(index: number, total: number) {
  return (index + total) % total;
}

function TestimonialImageBody({
  testimonial,
  imageTestId,
  priority = false,
}: {
  readonly testimonial: Testimonial;
  readonly imageTestId?: string;
  readonly priority?: boolean;
}) {
  return (
    <ApplyEntryTestimonialImage
      testimonial={testimonial}
      imageTestId={imageTestId}
      priority={priority}
    />
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
        <TestimonialImageBody testimonial={testimonial} />
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
  const shouldReduceMotion = useReducedMotion() ?? false;
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
                <TestimonialImageBody
                  testimonial={activeTestimonial}
                  imageTestId="active-testimonial-image"
                  priority={activeIndex === 0}
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
          key={previewTestimonial.id}
          className={PREVIEW_CARD_CLASS}
          onClick={showNext}
          aria-label={`Show testimonial: ${previewTestimonial.alt}`}
          data-testid="background-testimonial-trigger"
          animate={{ y: 32, scale: 0.98, opacity: 0.8 }}
          whileHover={
            shouldReduceMotion
              ? undefined
              : { y: 28, opacity: 0.9, scale: 0.985 }
          }
          transition={cardTransition}
        >
          <TestimonialImageBody testimonial={previewTestimonial} />
          <TestimonialCardFooterPlaceholder />
        </motion.button>
      </div>
    </div>
  );
}
