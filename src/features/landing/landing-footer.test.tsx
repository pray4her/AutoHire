// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  LANDING_DISCLOSURE,
  LANDING_FOOTER,
} from "@/features/landing/landing-content";
import { LandingFooter } from "@/features/landing/landing-footer";

describe("LandingFooter", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the full disclosure and the /apply entry link", () => {
    render(<LandingFooter />);

    expect(screen.getByText(LANDING_DISCLOSURE)).toBeInTheDocument();
    expect(
      screen.getAllByText(LANDING_FOOTER.companyName, { exact: false }).length,
    ).toBeGreaterThan(0);

    const applyLink = screen.getByRole("link", {
      name: LANDING_FOOTER.applyEntryLink.label,
    });
    expect(applyLink).toHaveAttribute("href", "/apply");
  });
});
