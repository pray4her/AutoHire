"use client";

import { useEffect } from "react";

import { trackClick, trackEvent, trackPageView } from "@/lib/tracking/client";

const TRACK_PAGE_NAME = "public_landing";

/**
 * Wires up landing-page observability without turning sections into client
 * components: sections carry `data-track-section` and CTAs carry
 * `data-track-cta`, and this component reports pageview, CTA clicks, and
 * section exposure (IntersectionObserver) from one place.
 */
export function LandingTracker() {
  useEffect(() => {
    void trackPageView({ pageName: TRACK_PAGE_NAME });

    const handleClick = (event: MouseEvent) => {
      const target =
        event.target instanceof Element
          ? event.target.closest("[data-track-cta]")
          : null;

      if (!target) {
        return;
      }

      void trackClick({
        eventType: "landing_cta_clicked",
        pageName: TRACK_PAGE_NAME,
        payload: { cta: target.getAttribute("data-track-cta") },
      });
    };

    document.addEventListener("click", handleClick);

    let observer: IntersectionObserver | null = null;

    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }

            observer?.unobserve(entry.target);
            void trackEvent({
              eventType: "landing_section_viewed",
              pageName: TRACK_PAGE_NAME,
              payload: {
                section: entry.target.getAttribute("data-track-section"),
              },
            });
          }
        },
        { threshold: 0.3 },
      );

      for (const section of document.querySelectorAll("[data-track-section]")) {
        observer.observe(section);
      }
    }

    return () => {
      document.removeEventListener("click", handleClick);
      observer?.disconnect();
    };
  }, []);

  return null;
}
