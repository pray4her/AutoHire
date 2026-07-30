import {
  APPLICATION_PROCESS_INSTRUCTIONS,
  COMPETITIVE_PACKAGE_ITEMS,
  ELIGIBILITY_CATEGORIES,
  ELIGIBILITY_NOTE,
  type IntroSectionId,
  PROCESS,
  SUB_PROGRAMS,
} from "@/features/application/components/apply-entry-intro-content";

export function renderProgramIntroductionContent(sectionId: IntroSectionId) {
  switch (sectionId) {
    case "overview":
      return (
        <div className="space-y-4 text-sm leading-7 text-[color:var(--foreground-soft)]">
          <p>
            The Global Excellent Scientists Fund (GESF), also known as the{" "}
            <strong className="text-base font-semibold text-[color:var(--foreground)]">
              CHINA national talent support program
            </strong>
            , is a prestigious national-level talent program initiated by
            relevant Chinese government departments. Its primary mission is to
            attract overseas scholars including those from Hong Kong, Macau, and
            Taiwan, regardless of nationality, to conduct research and
            innovation in China, thereby contributing to the nation&apos;s
            scientific and technological advancement.
          </p>
          <p>
            The program{" "}
            <strong className="font-semibold text-[color:var(--foreground)]">
              mainly
            </strong>{" "}
            encompasses the following sub-projects:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            {SUB_PROGRAMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      );
    case "benefits":
      return (
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-7 text-[color:var(--foreground-soft)] marker:font-semibold">
          {COMPETITIVE_PACKAGE_ITEMS.map((item) => (
            <li key={item} className="pl-1">
              {item}
            </li>
          ))}
        </ol>
      );
    case "eligibility":
      return (
        <div className="space-y-5 text-sm leading-7 text-[color:var(--foreground-soft)]">
          <p>
            Applicants must{" "}
            <strong className="font-semibold text-[color:var(--foreground)]">
              meet at least one
            </strong>{" "}
            of the following three sets of criteria.
          </p>
          <p>{ELIGIBILITY_NOTE}</p>
          {ELIGIBILITY_CATEGORIES.map((category) => (
            <div key={category.title} className="space-y-3">
              <p className="font-semibold text-[color:var(--foreground)]">
                {category.title}
              </p>
              <ol className="list-decimal space-y-3 pl-5 marker:font-semibold">
                {category.items.map((item) => (
                  <li key={item} className="pl-1">
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      );
    case "process":
      return (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {PROCESS.map((item, index) => (
              <div
                key={item}
                className="rounded-xl border border-[color:var(--border)] bg-white px-3 py-3"
              >
                <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm font-semibold text-[color:var(--primary)]">
                  {item}
                </p>
              </div>
            ))}
          </div>
          <div className="space-y-3 text-sm leading-7 text-[color:var(--foreground-soft)]">
            <p>The application process is linear, steps cannot be bypassed.</p>
            <p>Progress can be saved at each stage.</p>
            <p>
              You will receive feedback from our team within one week of final
              submission.
            </p>
          </div>
        </div>
      );
    case "timeline":
      return (
        <ol className="list-decimal space-y-5 pl-5 text-sm leading-7 text-[color:var(--foreground-soft)] marker:font-semibold">
          {APPLICATION_PROCESS_INSTRUCTIONS.map((step) => (
            <li key={step.title} className="pl-1">
              <p className="font-semibold text-[color:var(--foreground)]">
                {step.title}
              </p>
              <p className="mt-2">{step.description}</p>
              {"emphasis" in step && step.emphasis ? (
                <p className="mt-2">
                  <strong className="font-semibold text-[color:var(--foreground)]">
                    {step.emphasis}
                  </strong>
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      );
    case "about":
      return (
        <div className="flex flex-col gap-4 text-sm leading-7 text-[color:var(--foreground-soft)]">
          <p>
            <strong className="font-bold text-black">
              Meet Technology (Wuhan) Co., Ltd.
            </strong>{" "}
            is a licensed professional service institution for national-level
            talent programs. We specialize in{" "}
            <strong className="font-bold text-black">
              providing full-process application support for high-level overseas
              talents
            </strong>
            . Should you choose to submit your application through us, we will
            offer you three core services:
          </p>
          <ol className="list-decimal space-y-3 pl-5 marker:font-semibold">
            <li className="pl-1">
              <span className="font-semibold text-[color:var(--foreground)]">
                Material Preparation:
              </span>{" "}
              A professional team will assist you in collating application
              materials including resumes, achievement certificates, and
              recommendation letters. We ensure that the application documents
              we prepare for you meet national requirements and are highly
              competitive.
            </li>
            <li className="pl-1">
              <span className="font-semibold text-[color:var(--foreground)]">
                Platform Matching:
              </span>{" "}
              We will match you with competitive Chinese universities, research
              institutions and enterprises as your application platform. (The
              talent program requires candidates to apply jointly with a
              platform.)
            </li>
            <li className="pl-1">
              <span className="font-semibold text-[color:var(--foreground)]">
                Post-selection Support:
              </span>{" "}
              Upon your successful selection in the talent program, we will
              assist you in coordinating with local governments and affiliated
              platforms, facilitate the onboarding procedure, secure the
              incentive and subsidy funds, and obtain the national-level talent
              honor title.
            </li>
          </ol>
          <p>
            <strong className="font-semibold text-[color:var(--foreground)]">
              Beyond the talent program, we provide the following value-added
              services.
            </strong>
          </p>
          <ol className="list-decimal space-y-3 pl-5 marker:font-semibold">
            <li className="pl-1">
              <span className="font-semibold text-[color:var(--foreground)]">
                Academic Exchange:
              </span>{" "}
              We organize online and offline seminars and special lectures for
              overseas scholars, domestic universities and enterprises, so as to
              build long-term cooperation bridges.
            </li>
            <li className="pl-1">
              <span className="font-semibold text-[color:var(--foreground)]">
                Conferences &amp; Forums:
              </span>{" "}
              You may participate in international academic conferences and
              industry summits organized by us. We assist you in presenting
              research achievements and expanding industrial resources.
            </li>
            <li className="pl-1">
              <span className="font-semibold text-[color:var(--foreground)]">
                Technology Transfer:
              </span>{" "}
              We assist in commercializing your technological achievements with
              Chinese enterprises.
            </li>
            <li className="pl-1">
              <span className="font-semibold text-[color:var(--foreground)]">
                Entrepreneurial Financing &amp; Client Development:
              </span>{" "}
              We assist you in establishing enterprises in China, and support
              the commercialization of scientific research achievements from
              laboratories to the market.
            </li>
          </ol>
        </div>
      );
    default:
      return null;
  }
}
