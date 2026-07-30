// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LANDING_BENEFITS_SECTION } from "@/features/landing/landing-content";
import { LandingBenefits } from "@/features/landing/landing-benefits";

describe("LandingBenefits", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders all benefit items and the disclaimer", () => {
    render(<LandingBenefits />);

    for (const item of LANDING_BENEFITS_SECTION.items) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
    expect(
      screen.getByText(LANDING_BENEFITS_SECTION.disclaimer),
    ).toBeInTheDocument();
  });
});
