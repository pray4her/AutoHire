import { cn } from "@/lib/utils";
import type { MaterialCategory } from "@/features/application/types";

type GuidanceBlock = {
  title?: string;
  variant?: "list" | "paragraphs";
  items: readonly string[];
};

const GUIDANCE: Record<MaterialCategory, readonly GuidanceBlock[]> = {
  IDENTITY: [
    {
      items: [
        "Foreign nationals: Passport Bio-data page + Additional info page (a spread of 2 pages); International passport for Russian citizens (also a spread of 2 pages).",
        "Mainland China: national ID card, front and back.",
        "Hong Kong: Hong Kong identity card.",
        "Macau: Macau identity card.",
        "Taiwan: Mainland Travel Permit for Taiwan Residents (台胞证).",
      ],
    },
  ],
  EDUCATION: [
    {
      items: [
        "Doctoral degree certificate is required (at least one file in this category).",
        "Degree certificate scans/photo (original documents strongly preferred).",
        "Official transcripts (if available; optional).",
        "Certified translation or a signed verification letter (only when original certificates are missing).",
      ],
    },
  ],
  EMPLOYMENT: [
    {
      variant: "paragraphs",
      items: [
        "Acceptable forms of employment documents include: an employment contract, an appointment letter, an HR verification letter (for citizens in post-Soviet jurisdictions (and other jurisdictions where customary), an employment record book is also acceptable).",
        "In the absence of any of the employment contract, appointment letter or HR verification letter, please provide a promotion letter, a resignation letter, or other comparable employment milestone documents instead.",
        "An employment document for your current position is the bare minimum.",
      ],
    },
  ],
  PROJECT: [
    {
      items: [
        "Project proposal or charter specifying funding sources (required where applicable).",
        "Progress or final reports, grant award letters, and official confirmation letters.",
        "Project award certificates, and official screenshots (from funder websites, universities or national academic authorities).",
      ],
    },
  ],
  PAPER: [
    {
      items: [
        "Upload full-text versions of published papers as PDF, DOCX, or image files.",
        "Include DOI, journal information and publication metadata in the file where available.",
      ],
    },
  ],
  BOOK: [
    {
      items: [
        "Provide publisher website screenshots, or scans of book covers and key metadata pages.",
        "Make sure that the title, your name, publisher, publication date and place of publication are clearly visible.",
      ],
    },
  ],
  CONFERENCE: [
    {
      items: [
        "Conference website screenshots, proceedings papers, participation proof, or invitation letters.",
        "Posters should clearly show both the conference name and your name.",
      ],
    },
  ],
  PATENT: [
    {
      items: [
        "Patent certificate or official gazette extract (strongly preferred).",
        "Official registry screenshots and filing application forms (where original documents are unavailable).",
      ],
    },
  ],
  HONOR: [
    {
      items: [
        "Official website screenshots, honor certificates, thank-you letters, membership credentials and academic title certificates.",
        "Peer review or editorial board letters, trophies or medals clearly displaying the honor title and the recipient’s full name.",
      ],
    },
  ],
  PRODUCT: [
    {
      items: [
        "Summarize the product name, innovative features and measurable economic benefits in the text field above.",
        "Attach brochures, one-pagers, or deck materials as PDF, DOCX, or image files to support your product introduction.",
      ],
    },
  ],
};

export function MaterialCategoryGuidance({
  category,
}: {
  category: MaterialCategory;
}) {
  const blocks = GUIDANCE[category];

  return (
    <div className="mt-2 space-y-3 text-left">
      {blocks.map((block, blockIndex) => (
        <div key={block.title ?? `block-${blockIndex}`}>
          {block.title ? (
            <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
              {block.title}
            </p>
          ) : null}
          {block.variant === "paragraphs" ? (
            <div
              className={cn(
                "space-y-3 text-sm leading-6 text-slate-600",
                block.title ? "mt-1.5" : "",
              )}
            >
              {block.items.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ) : (
            <ul
              className={cn(
                "list-disc space-y-1.5 pl-4 text-sm leading-6 text-slate-600 marker:text-slate-400",
                block.title ? "mt-1.5" : "",
              )}
            >
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
