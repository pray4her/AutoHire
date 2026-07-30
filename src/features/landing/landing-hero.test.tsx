// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LANDING_HERO } from "@/features/landing/landing-content";
import { LandingHero } from "@/features/landing/landing-hero";

describe("LandingHero", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the single h1 and both CTAs", () => {
    render(<LandingHero />);

    expect(
      screen.getByRole("heading", { level: 1, name: LANDING_HERO.title }),
    ).toBeInTheDocument();

    const primaryCta = screen.getByRole("link", {
      name: LANDING_HERO.primaryCta.label,
    });
    expect(primaryCta).toHaveAttribute("href", "/signup");
    expect(primaryCta).toHaveAttribute("data-track-cta", "hero_primary");

    const secondaryCta = screen.getByRole("link", {
      name: LANDING_HERO.secondaryCta.label,
    });
    expect(secondaryCta).toHaveAttribute("href", "#eligibility");
  });
});
