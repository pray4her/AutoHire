// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type { ImgHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TESTIMONIAL_HIGHLIGHTS } from "@/features/application/components/apply-entry-intro-content";
import { StackedTestimonialsCarousel } from "@/features/application/components/stacked-testimonials-carousel";

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    const {
      fill: _fill,
      priority: _priority,
      unoptimized: _unoptimized,
      ...imgProps
    } = props;

    return <img {...imgProps} />;
  },
}));

describe("StackedTestimonialsCarousel", () => {
  afterEach(() => {
    cleanup();
  });

  it("advances when the background card is clicked", async () => {
    const user = userEvent.setup();

    render(<StackedTestimonialsCarousel testimonials={TESTIMONIAL_HIGHLIGHTS} />);

    expect(screen.getByTestId("active-testimonial-image")).toHaveAttribute(
      "src",
      TESTIMONIAL_HIGHLIGHTS[0].src,
    );

    await user.click(screen.getByTestId("background-testimonial-trigger"));

    await waitFor(() => {
      expect(screen.getAllByTestId("active-testimonial-image")).toHaveLength(1);
    });
    expect(screen.getByTestId("active-testimonial-image")).toHaveAttribute(
      "src",
      TESTIMONIAL_HIGHLIGHTS[1].src,
    );
  });

  it("wraps with the previous and next controls", async () => {
    const user = userEvent.setup();

    const { getByRole } = render(
      <StackedTestimonialsCarousel testimonials={TESTIMONIAL_HIGHLIGHTS} />,
    );

    await user.click(
      getByRole("button", { name: "Show previous testimonial" }),
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("active-testimonial-image")).toHaveLength(1);
    });
    expect(screen.getByTestId("active-testimonial-image")).toHaveAttribute(
      "src",
      TESTIMONIAL_HIGHLIGHTS[TESTIMONIAL_HIGHLIGHTS.length - 1].src,
    );

    await user.click(
      getByRole("button", { name: "Show next testimonial" }),
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("active-testimonial-image")).toHaveLength(1);
    });
    expect(screen.getByTestId("active-testimonial-image")).toHaveAttribute(
      "src",
      TESTIMONIAL_HIGHLIGHTS[0].src,
    );
  });

  it("renders the preview card with the same image body structure as the active card", () => {
    render(<StackedTestimonialsCarousel testimonials={TESTIMONIAL_HIGHLIGHTS} />);

    const previewCard = screen.getByTestId("background-testimonial-trigger");
    const previewImage = within(previewCard).getByRole("img", {
      name: TESTIMONIAL_HIGHLIGHTS[1].alt,
    });

    expect(previewImage).toHaveAttribute("src", TESTIMONIAL_HIGHLIGHTS[1].src);
    expect(previewImage).toHaveAttribute("width", String(TESTIMONIAL_HIGHLIGHTS[1].width));
    expect(previewImage).toHaveAttribute("height", String(TESTIMONIAL_HIGHLIGHTS[1].height));
  });

  it("renders the image at its intrinsic aspect ratio without a fixed-height container", () => {
    render(<StackedTestimonialsCarousel testimonials={TESTIMONIAL_HIGHLIGHTS} />);

    const image = screen.getByTestId("active-testimonial-image");

    expect(image).not.toHaveClass("overflow-y-auto");
    expect(image.closest("[class*='aspect-']")).toBeNull();
    expect(image).toHaveAttribute("alt", TESTIMONIAL_HIGHLIGHTS[0].alt);
    expect(image).toHaveAttribute("width", String(TESTIMONIAL_HIGHLIGHTS[0].width));
    expect(image).toHaveAttribute("height", String(TESTIMONIAL_HIGHLIGHTS[0].height));
    expect(image).toHaveClass("h-auto", "w-full");
  });

  it("switches cards with horizontal swipe gestures", async () => {
    render(<StackedTestimonialsCarousel testimonials={TESTIMONIAL_HIGHLIGHTS} />);

    const activeCard = screen.getByTestId("active-testimonial-card");

    fireEvent.pointerDown(activeCard, {
      pointerId: 1,
      clientX: 220,
      clientY: 220,
    });
    fireEvent.pointerUp(activeCard, {
      pointerId: 1,
      clientX: 140,
      clientY: 210,
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("active-testimonial-image")).toHaveLength(1);
    });
    expect(screen.getByTestId("active-testimonial-image")).toHaveAttribute(
      "src",
      TESTIMONIAL_HIGHLIGHTS[1].src,
    );

    fireEvent.pointerDown(activeCard, {
      pointerId: 2,
      clientX: 180,
      clientY: 220,
    });
    fireEvent.pointerUp(activeCard, {
      pointerId: 2,
      clientX: 185,
      clientY: 300,
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("active-testimonial-image")).toHaveLength(1);
    });
    expect(screen.getByTestId("active-testimonial-image")).toHaveAttribute(
      "src",
      TESTIMONIAL_HIGHLIGHTS[1].src,
    );
  });

  it("ignores vertical swipe gestures", () => {
    render(<StackedTestimonialsCarousel testimonials={TESTIMONIAL_HIGHLIGHTS} />);

    const activeCard = screen.getByTestId("active-testimonial-card");

    fireEvent.pointerDown(activeCard, {
      pointerId: 3,
      clientX: 180,
      clientY: 220,
    });
    fireEvent.pointerUp(activeCard, {
      pointerId: 3,
      clientX: 185,
      clientY: 300,
    });

    expect(screen.getByTestId("active-testimonial-image")).toHaveAttribute(
      "src",
      TESTIMONIAL_HIGHLIGHTS[0].src,
    );
  });
});
