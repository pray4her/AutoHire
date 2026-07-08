// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type { ImgHTMLAttributes, ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TESTIMONIAL_HIGHLIGHTS } from "@/features/application/components/apply-entry-intro-content";
import { TestimonialHighlightsGallery } from "@/features/application/components/testimonial-highlights-gallery";

type LightboxSlide = {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
};

type LightboxMockProps = {
  readonly open: boolean;
  readonly close: () => void;
  readonly index: number;
  readonly slides: readonly LightboxSlide[];
  readonly controller?: {
    readonly closeOnBackdropClick?: boolean;
  };
};

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    const { fill, priority, unoptimized, alt = "", ...imgProps } = props;
    void fill;
    void priority;
    void unoptimized;

    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...imgProps} />;
  },
}));

vi.mock("yet-another-react-lightbox", () => ({
  default: ({
    open,
    close,
    index,
    slides,
    controller,
  }: LightboxMockProps): ReactNode =>
    open ? (
      <div
        role="dialog"
        aria-label="Testimonial image preview"
        data-testid="testimonial-lightbox"
        data-index={index}
        data-slide-count={slides.length}
        data-close-on-backdrop={
          controller?.closeOnBackdropClick ? "true" : "false"
        }
      >
        <button type="button" onClick={close}>
          Close preview
        </button>
      </div>
    ) : null,
}));

describe("TestimonialHighlightsGallery", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders one active image with carousel controls and no thumbnails", () => {
    render(
      <TestimonialHighlightsGallery testimonials={TESTIMONIAL_HIGHLIGHTS} />,
    );

    const gallery = screen.getByTestId("testimonial-gallery");

    expect(screen.getByTestId("active-testimonial-image")).toHaveAttribute(
      "src",
      TESTIMONIAL_HIGHLIGHTS[0].src,
    );
    expect(
      within(gallery).queryAllByTestId("testimonial-thumbnail"),
    ).toHaveLength(0);
    expect(
      within(gallery).getByRole("button", {
        name: "Show previous testimonial",
      }),
    ).toBeInTheDocument();
    expect(
      within(gallery).getByRole("button", { name: "Show next testimonial" }),
    ).toBeInTheDocument();
  });

  it("switches the active image with side buttons", async () => {
    const user = userEvent.setup();

    render(
      <TestimonialHighlightsGallery testimonials={TESTIMONIAL_HIGHLIGHTS} />,
    );

    await user.click(
      screen.getByRole("button", { name: "Show next testimonial" }),
    );

    expect(screen.getByTestId("active-testimonial-image")).toHaveAttribute(
      "src",
      TESTIMONIAL_HIGHLIGHTS[1].src,
    );

    await user.click(
      screen.getByRole("button", { name: "Show previous testimonial" }),
    );

    expect(screen.getByTestId("active-testimonial-image")).toHaveAttribute(
      "src",
      TESTIMONIAL_HIGHLIGHTS[0].src,
    );
  });

  it("opens the lightbox overlay from the active preview", async () => {
    const user = userEvent.setup();

    render(
      <TestimonialHighlightsGallery testimonials={TESTIMONIAL_HIGHLIGHTS} />,
    );

    await user.click(screen.getByTestId("active-testimonial-preview"));

    const lightbox = screen.getByTestId("testimonial-lightbox");

    expect(lightbox).toHaveAttribute("data-index", "0");
    expect(lightbox).toHaveAttribute("data-slide-count", "6");
    expect(lightbox).toHaveAttribute("data-close-on-backdrop", "true");

    await user.click(screen.getByRole("button", { name: "Close preview" }));

    expect(
      screen.queryByTestId("testimonial-lightbox"),
    ).not.toBeInTheDocument();
  });
});
