// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ReferralLanding } from "@/features/referral-tokens/components/referral-landing";

describe("ReferralLanding", () => {
  afterEach(cleanup);

  it("shows the expert endorsement and carries referral context to signup", () => {
    // Given
    const referralToken = "a".repeat(64);

    // When
    render(
      <ReferralLanding
        referralToken={referralToken}
        result={{
          status: "VALID",
          expert: {
            name: "张教授",
            title: "材料科学教授",
            organization: "示例大学",
            email: "expert@example.com",
          },
        }}
      />,
    );

    // Then
    expect(screen.getByRole("heading", { name: /张教授/ })).toBeInTheDocument();
    expect(screen.getByText("材料科学教授")).toBeInTheDocument();
    expect(screen.getByText("示例大学")).toBeInTheDocument();
    expect(screen.getByText("此链接由专家本人转发")).toBeInTheDocument();
    expect(
      screen.getAllByText(/Global Excellent Scientists Fund/).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "开始申报" })).toHaveAttribute(
      "href",
      `/api/referrals/context?t=${referralToken}`,
    );
  });

  it("shows a dignified fallback without exposing why a link is unavailable", () => {
    // Given
    const result = { status: "UNAVAILABLE" } as const;

    // When
    render(<ReferralLanding referralToken="expired-token" result={result} />);

    // Then
    expect(
      screen.getByRole("heading", { name: "这条推荐链接暂时不可用" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "直接开始申报" })).toHaveAttribute(
      "href",
      "/signup",
    );
    expect(
      screen.queryByText(/EXPIRED|DISABLED|INVALID/),
    ).not.toBeInTheDocument();
  });
});
