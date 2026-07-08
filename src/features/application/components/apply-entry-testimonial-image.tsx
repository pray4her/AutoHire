"use client";

import Image from "next/image";

import type { Testimonial } from "@/features/application/components/apply-entry-intro-content";

/** Footer card is 88% of ~1116px content width; request enough pixels for retina. */
const TESTIMONIAL_IMAGE_SIZES = "(max-width: 768px) 88vw, 1040px";

type ApplyEntryTestimonialImageProps = {
  readonly testimonial: Testimonial;
  readonly imageTestId?: string;
  readonly priority?: boolean;
};

export function ApplyEntryTestimonialImage({
  testimonial,
  imageTestId,
  priority = false,
}: ApplyEntryTestimonialImageProps) {
  return (
    <Image
      src={testimonial.src}
      alt={testimonial.alt}
      width={testimonial.width}
      height={testimonial.height}
      sizes={TESTIMONIAL_IMAGE_SIZES}
      quality={100}
      unoptimized
      className="h-auto w-full"
      data-testid={imageTestId}
      priority={priority}
    />
  );
}
