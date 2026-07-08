import { Mail, MessageCircle } from "lucide-react";

import { ApplyEntryTestimonialImage } from "@/features/application/components/apply-entry-testimonial-image";
import {
  CORRESPONDENCE_RECORD,
  QUALIFICATION_ITEMS,
  TALENT_CONSULTANT_EMAIL,
  TALENT_CONSULTANT_PHONE,
  TALENT_CONSULTANT_WHATSAPP_URL,
  TESTIMONIAL_HIGHLIGHTS,
  type TopInfoSectionId,
  WHO_ARE_WE_COPY,
} from "@/features/application/components/apply-entry-intro-content";
import { StackedTestimonialsCarousel } from "@/features/application/components/stacked-testimonials-carousel";

const CORRESPONDENCE_RECORD_PANEL_CLASS =
  "w-[88%] overflow-hidden rounded-[1.65rem] border border-[color:var(--border)] bg-white/95 shadow-[0_24px_64px_rgba(15,23,42,0.14)]";

export function renderApplyEntryTopInfoContent(sectionId: TopInfoSectionId) {
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
    case "testimonials":
      return (
        <StackedTestimonialsCarousel testimonials={TESTIMONIAL_HIGHLIGHTS} />
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
    case "correspondence-record":
      return (
        <div className="relative pr-6 pb-2">
          <article
            className={CORRESPONDENCE_RECORD_PANEL_CLASS}
            data-testid="correspondence-record-panel"
          >
            <ApplyEntryTestimonialImage
              testimonial={CORRESPONDENCE_RECORD}
              imageTestId="correspondence-record-image"
              priority
            />
          </article>
        </div>
      );
    default:
      return null;
  }
}
