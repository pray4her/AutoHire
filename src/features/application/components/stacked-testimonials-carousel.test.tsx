// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TESTIMONIALS } from "@/features/application/components/apply-entry-intro-content";
import { StackedTestimonialsCarousel } from "@/features/application/components/stacked-testimonials-carousel";

describe("StackedTestimonialsCarousel", () => {
  afterEach(() => {
    cleanup();
  });

  it("advances when the background card is clicked", async () => {
    const user = userEvent.setup();

    render(<StackedTestimonialsCarousel testimonials={TESTIMONIALS} />);

    expect(screen.getByTestId("active-testimonial-role")).toHaveTextContent(
      TESTIMONIALS[0].role,
    );

    await user.click(screen.getByTestId("background-testimonial-trigger"));

    await waitFor(() => {
      expect(screen.getAllByTestId("active-testimonial-role")).toHaveLength(1);
    });
    expect(screen.getByTestId("active-testimonial-role")).toHaveTextContent(
      TESTIMONIALS[1].role,
    );
  });

  it("wraps with the previous and next controls", async () => {
    const user = userEvent.setup();

    const { getByRole } = render(
      <StackedTestimonialsCarousel testimonials={TESTIMONIALS} />,
    );

    await user.click(
      getByRole("button", { name: "Show previous testimonial" }),
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("active-testimonial-role")).toHaveLength(1);
    });
    expect(screen.getByTestId("active-testimonial-role")).toHaveTextContent(
      TESTIMONIALS[3].role,
    );

    await user.click(
      getByRole("button", { name: "Show next testimonial" }),
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("active-testimonial-role")).toHaveLength(1);
    });
    expect(screen.getByTestId("active-testimonial-role")).toHaveTextContent(
      TESTIMONIALS[0].role,
    );
  });

  it("renders the preview card with the same body structure as the active card", () => {
    render(<StackedTestimonialsCarousel testimonials={TESTIMONIALS} />);

    const previewCard = screen.getByTestId("background-testimonial-trigger");

    expect(previewCard).toHaveTextContent(TESTIMONIALS[1].quote);
    expect(previewCard).toHaveTextContent(TESTIMONIALS[1].role);
    expect(previewCard).toHaveTextContent(TESTIMONIALS[1].affiliation);
    const previewQuote = within(previewCard)
      .getAllByText(TESTIMONIALS[1].quote)
      .find((element) => !element.closest(".invisible"));

    expect(previewQuote).toBeDefined();
    expect(previewQuote).not.toHaveClass("line-clamp-2");
  });

  it("renders the full quote without an internal scroll container", () => {
    render(<StackedTestimonialsCarousel testimonials={TESTIMONIALS} />);

    const quote = screen.getByTestId("active-testimonial-quote");

    expect(quote).not.toHaveClass("overflow-y-auto");
    expect(quote.closest("[class*='overflow-y-auto']")).toBeNull();
    expect(quote).toHaveTextContent(TESTIMONIALS[0].quote);
  });

  it("switches cards with horizontal swipe gestures", async () => {
    render(<StackedTestimonialsCarousel testimonials={TESTIMONIALS} />);

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
      expect(screen.getAllByTestId("active-testimonial-role")).toHaveLength(1);
    });
    expect(screen.getByTestId("active-testimonial-role")).toHaveTextContent(
      TESTIMONIALS[1].role,
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
      expect(screen.getAllByTestId("active-testimonial-role")).toHaveLength(1);
    });
    expect(screen.getByTestId("active-testimonial-role")).toHaveTextContent(
      TESTIMONIALS[1].role,
    );
  });

  it("ignores vertical swipe gestures", () => {
    render(<StackedTestimonialsCarousel testimonials={TESTIMONIALS} />);

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

    expect(screen.getByTestId("active-testimonial-role")).toHaveTextContent(
      TESTIMONIALS[0].role,
    );
  });
});
