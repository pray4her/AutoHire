import { SUBMISSION_COMPLETE_CONTACT_EMAIL } from "@/features/application/constants";

export const PROCESS = [
  "About GESF",
  "CV Submission",
  "Upload Required Documents",
  "Submission Complete",
] as const;

export const INTRO_DESCRIPTION =
  "The 2026 application cycle is now closed. We are currently preparing for the 2027 application. Due to the large volume of required documents, please contact us early to begin your preparations.";

export const APPLICATION_DEADLINE_PILL = "Applications are accepted year-round.";

export const COMPETITIVE_PACKAGE_ITEMS = [
  "Annual Salary: ¥500K – ¥2M RMB (negotiable)",
  "Talent Reward: ¥1.5M – ¥6M RMB (paid over 3–5 years)",
  "Comprehensive Benefits: Including housing subsidies, children's school enrollment support, tax benefits",
  'Title: the prestigious "National High-Level Talent" title.',
] as const;

export const ELIGIBILITY_NOTE =
  "Note: The three sets of criteria below are not mutually exclusive; a candidate can meet more than one category, and this does not affect their eligibility.";

export const ELIGIBILITY_CATEGORIES = [
  {
    title: "Category I: Young Talents",
    items: [
      "Hold a doctoral degree;",
      "Have at least 3 consecutive years of full-time work experience outside mainland China after obtaining the doctoral degree (short gaps are allowed), and currently hold a formal position outside mainland China;",
      "Under the age of 40.",
    ],
  },
  {
    title: "Category II: Innovative Talents",
    items: [
      "Hold a doctoral degree;",
      "Have at least 3 consecutive years of full-time work experience outside mainland China after obtaining the doctoral degree (short gaps are allowed), and currently hold a formal position outside mainland China;",
      "Hold a position equivalent to associate professor in academic institutions, or a position equivalent to middle to senior positions or above in the industry. (Note: No age limit applies to this category.)",
    ],
  },
  {
    title: "Category III: Distinguished Engineers",
    items: [
      "Hold a bachelor's degree or above;",
      "Have at least 10 consecutive years of full-time work experience in enterprises outside mainland China after obtaining the bachelor's degree (short gaps are allowed), and currently hold a formal position in an enterprise outside mainland China;",
      "Currently hold a core technical role with a professional technical title equivalent to senior engineer or above.",
    ],
  },
] as const;

export const APPLICATION_PROCESS_INSTRUCTIONS = [
  {
    title: "Year-round Application Acceptance",
    description:
      "We accept applications throughout the year. We recommend submitting your materials as early as possible so we can fully prepare your application.",
  },
  {
    title: "Official Submission Window",
    description:
      "The official submission window is tentatively scheduled from January to May each year, subject to annual adjustments.",
    emphasis:
      "During this period, we will assist you in submitting the formal application to the official authorities.",
  },
  {
    title: "Result Announcement",
    description:
      "The final selection results will be announced in December of the same year.",
  },
  {
    title: "Preparation Period and Contract Signing",
    description:
      "Selected candidates will be granted a two-year preparation period starting from the year following the announcement of results. During this period, you may flexibly plan your trips to China and determine the employment mode (full-time or part-time).",
  },
] as const;

export const SUB_PROGRAMS = [
  "Qiming Plan (QM)",
  "Torch Plan (HJ)",
  "Changjiang Scholar",
] as const;

export const INTRO_SECTION_ITEMS = [
  {
    id: "overview",
    title: "Global Excellent Scientists Fund (GESF)",
    summary: "Program Mission & Objectives",
  },
  {
    id: "benefits",
    title: "Benefits",
    summary: "Competitive Package",
  },
  {
    id: "eligibility",
    title: "Eligibility",
    summary:
      "Young Talents, Innovative Talents, or Distinguished Engineers.",
  },
  {
    id: "process",
    title: "Online Application Process",
    summary:
      "Four steps, progress saves at each stage, and feedback after you submit.",
  },
  {
    id: "timeline",
    title: "Instructions for Application Process",
    summary:
      "Year-round acceptance, official submission window, results, and preparation period.",
  },
  {
    id: "about",
    title: "About Our Service",
    summary:
      "Professional Service Provider for National Talent Programs: Our Role and Commitment",
  },
] as const;

export type IntroSectionId = (typeof INTRO_SECTION_ITEMS)[number]["id"];

export const APPLY_ENTRY_ACCORDION_SECTION_CLASS =
  "overflow-hidden rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--background-elevated)] shadow-[var(--shadow-card)]";

export const APPLY_ENTRY_ACCORDION_TRIGGER_CLASS =
  "grid w-full grid-cols-[minmax(0,1fr)_2.5rem] items-start gap-3 px-5 py-5 text-left transition hover:bg-[color:var(--muted)]/55 sm:px-6";

export const APPLY_ENTRY_ACCORDION_PANEL_CLASS =
  "w-full min-w-0 border-t border-[color:var(--border)] bg-[color:var(--muted)]/38 px-5 py-5 sm:px-6";

export const PERSONALIZED_LINK_NOTICE_ITEMS = [
  {
    title: "Unique Link – Please Do Not Forward",
    description:
      "The link you received is exclusively generated for you and can only be used to submit a single application. To protect your personal privacy, please do not forward this link to others.",
  },
  {
    title: "Link Expiration Date",
    description:
      "This link will remain valid until {expirationDate}. Please be aware of the deadline and complete your submission as soon as possible, as the link will automatically expire afterward.",
  },
  {
    title: "Saving Progress & Switching Devices",
    description:
      "Within the valid period, the system will automatically record and save your progress. If you switch to a different phone, computer, or browser midway through the process, please ensure you re-enter the application by clicking the full link in the original email. This will allow you to seamlessly resume your previous entries.",
  },
] as const;

export type TopInfoItem = {
  readonly id: string;
  readonly title: string;
  readonly shortTitle: string;
};

export const TOP_INFO_ITEMS = [
  {
    id: "who-are-we",
    title: "who are we",
    shortTitle: "Who we are",
  },
  {
    id: "qualification",
    title: "Why are we qualified to handle your application",
    shortTitle: "Qualified",
  },
  {
    id: "testimonials",
    title: "Testimonials & Appreciation Highlights",
    shortTitle: "Testimonials",
  },
  {
    id: "consultant",
    title: "Chat with a talent consultant",
    shortTitle: "Consultant",
  },
] as const satisfies readonly TopInfoItem[];

export type TopInfoSectionId = (typeof TOP_INFO_ITEMS)[number]["id"];

export const WHO_ARE_WE_COPY =
  "Meet Technology (Wuhan) Co., Ltd. Is a talent consulting company which integrates global top talents, technology projects, venture capital, industrial parks, research institutes and listed companies and other elements of science and technology innovation to promote high-quality urban development.";

export const QUALIFICATION_ITEMS = [
  "10+ years experience",
  "200+ cities and industrial parks across 28 provinces served",
  "5000+ overseas experts supported",
] as const;

export const TALENT_CONSULTANT_EMAIL = SUBMISSION_COMPLETE_CONTACT_EMAIL;
export const TALENT_CONSULTANT_PHONE = "+8617363307362";
export const TALENT_CONSULTANT_WHATSAPP_URL = "https://wa.me/8617363307362";

export type Testimonial = {
  readonly id: string;
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
};

export const TESTIMONIAL_HIGHLIGHTS = [
  {
    id: "appreciation-letter-1",
    src: "/apply/testimonials/appreciation-letter-1.png",
    alt: "Appreciation letter from an expert in Biomedical Sciences, Member of the Cuban Academy of Sciences",
    width: 1005,
    height: 549,
  },
  {
    id: "appreciation-letter-2",
    src: "/apply/testimonials/appreciation-letter-2.png",
    alt: "Appreciation letter from an expert in the scientific application of machine learning and computer vision, currently working at one of the 17 U.S. National Laboratories",
    width: 850,
    height: 314,
  },
  {
    id: "appreciation-letter-3",
    src: "/apply/testimonials/appreciation-letter-3.png",
    alt: "Appreciation letter from an expert in the field of plant science, currently a tenured associate professor at a university ranked among the top 150 worldwide by QS",
    width: 838,
    height: 214,
  },
  {
    id: "appreciation-letter-4",
    src: "/apply/testimonials/appreciation-letter-4.png",
    alt: "Appreciation letter from an expert in the field of biological sciences, currently a tenured full professor at a university ranked among the top 120 worldwide by QS",
    width: 1515,
    height: 527,
  },
  {
    id: "appreciation-letter-5",
    src: "/apply/testimonials/appreciation-letter-5.png",
    alt: "Appreciation letter from a program participant",
    width: 1515,
    height: 563,
  },
  {
    id: "appreciation-letter-6",
    src: "/apply/testimonials/appreciation-letter-6.png",
    alt: "Correspondence record with a selected candidate",
    width: 1515,
    height: 691,
  },
] as const satisfies readonly Testimonial[];
