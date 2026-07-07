// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkExperienceEmptyHint } from "@/features/application/components/work-experience-empty-hint";

describe("WorkExperienceEmptyHint", () => {
  it("renders Example in bold", () => {
    render(<WorkExperienceEmptyHint />);

    const exampleLabel = screen.getByText("Example:");

    expect(exampleLabel.tagName).toBe("STRONG");
    expect(exampleLabel).toHaveClass("font-semibold");
  });

  it("keeps pipe separators attached to the following segment", () => {
    const { container } = render(<WorkExperienceEmptyHint />);

    expect(container.textContent).toContain(
      "|Department of Mathematics",
    );
    expect(container.textContent).toContain("|Professor");
    expect(container.textContent).not.toMatch(/\|\s*\|/);
  });
});
