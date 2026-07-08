"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";

import { ApplyEntryTestimonialImage } from "@/features/application/components/apply-entry-testimonial-image";
import type { Testimonial } from "@/features/application/components/apply-entry-intro-content";
import { cn } from "@/lib/utils";

type TestimonialHighlightsGalleryProps = {
  readonly testimonials: readonly Testimonial[];
};

const IMAGE_NAV_BUTTON_CLASS =
  "absolute top-1/2 z-10 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[color:var(--primary)] shadow-[0_12px_30px_rgba(15,23,42,0.2)] transition hover:bg-white motion-reduce:transition-none";

function getWrappedIndex(index: number, total: number) {
  return (index + total) % total;
}

export function TestimonialHighlightsGallery({
  testimonials,
}: TestimonialHighlightsGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const activeTestimonial = testimonials[activeIndex] ?? testimonials[0];

  if (!activeTestimonial) {
    return null;
  }

  const lightboxSlides = testimonials.map((testimonial) => ({
    src: testimonial.src,
    alt: testimonial.alt,
    width: testimonial.width,
    height: testimonial.height,
  }));

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

  return (
    <div data-testid="testimonial-gallery">
      <div className="relative overflow-hidden rounded-[1.25rem] border border-[color:var(--border)] bg-white/95 shadow-[0_18px_48px_rgba(15,23,42,0.1)]">
        <button
          type="button"
          className="block w-full text-left"
          onClick={() => setLightboxIndex(activeIndex)}
          aria-label={`Open preview: ${activeTestimonial.alt}`}
          data-testid="active-testimonial-preview"
        >
          <ApplyEntryTestimonialImage
            testimonial={activeTestimonial}
            imageTestId="active-testimonial-image"
            priority={activeIndex === 0}
          />
        </button>

        <button
          type="button"
          className={cn(IMAGE_NAV_BUTTON_CLASS, "left-3")}
          onClick={showPrevious}
          aria-label="Show previous testimonial"
          data-testid="previous-testimonial-button"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          className={cn(IMAGE_NAV_BUTTON_CLASS, "right-3")}
          onClick={showNext}
          aria-label="Show next testimonial"
          data-testid="next-testimonial-button"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      <Lightbox
        open={lightboxIndex !== null}
        close={() => setLightboxIndex(null)}
        index={lightboxIndex ?? 0}
        slides={lightboxSlides}
        controller={{ closeOnBackdropClick: true }}
      />
    </div>
  );
}
