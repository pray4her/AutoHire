"use client";

import { ChevronDown, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";

import {
  APPLY_ENTRY_ACCORDION_PANEL_CLASS,
  APPLY_ENTRY_ACCORDION_TRIGGER_CLASS,
  QUALIFICATION_ITEMS,
  TALENT_CONSULTANT_EMAIL,
  TALENT_CONSULTANT_PHONE,
  TALENT_CONSULTANT_WHATSAPP_URL,
  TESTIMONIALS,
  TOP_INFO_DEFAULT_SECTION_ID,
  TOP_INFO_ITEMS,
  type TopInfoSectionId,
  WHO_ARE_WE_COPY,
} from "@/features/application/components/apply-entry-intro-content";
import { StackedTestimonialsCarousel } from "@/features/application/components/stacked-testimonials-carousel";
import { cn } from "@/lib/utils";

export function ApplyEntryTopInfo() {
  const [openSectionId, setOpenSectionId] = useState<TopInfoSectionId | null>(
    TOP_INFO_DEFAULT_SECTION_ID,
  );

  return (
    <>
      {TOP_INFO_ITEMS.map((item) => {
        const isOpen = openSectionId === item.id;
        const panelId = `apply-top-info-panel-${item.id}`;

        return (
          <div key={item.id} className="bg-white/72">
            <button
              type="button"
              id={`apply-top-info-trigger-${item.id}`}
              className={APPLY_ENTRY_ACCORDION_TRIGGER_CLASS}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => {
                setOpenSectionId((currentSectionId) =>
                  currentSectionId === item.id ? null : item.id,
                );
              }}
            >
              <div className="min-w-0">
                <p className="text-lg font-semibold tracking-[-0.02em] text-[color:var(--primary)]">
                  {item.title}
                </p>
              </div>
              <span
                className="flex size-10 items-center justify-center self-start"
                aria-hidden
              >
                <ChevronDown
                  className={cn(
                    "size-5 text-slate-400 transition-transform duration-200 ease-out motion-reduce:transition-none",
                    isOpen ? "rotate-180 text-[color:var(--primary)]" : "",
                  )}
                />
              </span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={`apply-top-info-trigger-${item.id}`}
              aria-hidden={!isOpen}
              className={cn(
                "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div
                className="overflow-hidden"
                inert={!isOpen ? true : undefined}
              >
                <div className={APPLY_ENTRY_ACCORDION_PANEL_CLASS}>
                  <div className="w-full min-w-0 max-w-none">
                    {renderTopInfoContent(item.id)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

function renderTopInfoContent(sectionId: TopInfoSectionId) {
  switch (sectionId) {
    case "who-are-we":
      return (
        <div className="flex flex-col gap-4 text-sm leading-7 text-[color:var(--foreground-soft)]">
          <p>{WHO_ARE_WE_COPY}</p>
        </div>
      );
    case "qualification":
      return (
        <ul className="flex list-disc flex-col gap-3 pl-5 text-sm leading-7 text-[color:var(--foreground-soft)]">
          {QUALIFICATION_ITEMS.map((item) => (
            <li key={item} className="pl-1">
              <strong className="font-semibold text-[color:var(--foreground)]">
                {item}
              </strong>
            </li>
          ))}
        </ul>
      );
    case "consultant":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href={`mailto:${TALENT_CONSULTANT_EMAIL}`}
            className="flex min-h-32 flex-col justify-between rounded-2xl border border-[color:var(--border)] bg-white/88 p-5 transition hover:border-[color:var(--primary)] hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] motion-reduce:transition-none"
          >
            <div className="flex flex-col gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-[color:var(--muted)] text-[color:var(--primary)]">
                <Mail className="size-4" aria-hidden />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-[color:var(--foreground)]">
                  Email
                </p>
                <p className="text-sm leading-7 text-[color:var(--foreground-soft)]">
                  {TALENT_CONSULTANT_EMAIL}
                </p>
              </div>
            </div>
          </a>

          <a
            href={TALENT_CONSULTANT_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-32 flex-col justify-between rounded-2xl border border-[color:var(--border)] bg-white/88 p-5 transition hover:border-[color:var(--primary)] hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] motion-reduce:transition-none"
          >
            <div className="flex flex-col gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-[color:var(--muted)] text-[color:var(--primary)]">
                <MessageCircle className="size-4" aria-hidden />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-[color:var(--foreground)]">
                  WhatsApp
                </p>
                <p className="text-sm leading-7 text-[color:var(--foreground-soft)]">
                  {TALENT_CONSULTANT_PHONE}
                </p>
              </div>
            </div>
          </a>
        </div>
      );
    case "testimonials":
      return <StackedTestimonialsCarousel testimonials={TESTIMONIALS} />;
    default:
      return null;
  }
}
