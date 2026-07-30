import { describe, expect, it } from "vitest";

import * as landingContent from "@/features/landing/landing-content";
import {
  LANDING_DISCLOSURE,
  LANDING_PRIMARY_CTA,
} from "@/features/landing/landing-content";

const ALL_COPY = JSON.stringify(landingContent);

describe("landing content", () => {
  it("keeps the non-affiliation disclosure intact", () => {
    expect(LANDING_DISCLOSURE).toContain("not an official government website");
    expect(LANDING_DISCLOSURE).toContain("not affiliated");
  });

  it("never promises outcomes or government partnership", () => {
    expect(ALL_COPY).not.toMatch(/guarantee/i);
    expect(ALL_COPY).not.toMatch(/core service partner/i);
  });

  it("points the primary CTA at /signup", () => {
    expect(LANDING_PRIMARY_CTA.href).toBe("/signup");
  });
});
