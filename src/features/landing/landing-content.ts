import { SUBMISSION_COMPLETE_CONTACT_EMAIL } from "@/features/application/constants";

/**
 * Copy for the Public Landing Page (`/`). English-only by product decision.
 *
 * Editorial rules agreed for this page:
 * - No outcome promises (never "guaranteed admission" or similar).
 * - No claims of government affiliation; the non-affiliation disclosure below
 *   must stay intact and visible.
 * - Figures carry a "varies by program and host institution" qualifier.
 */

export const LANDING_COMPANY_NAME = "Meet Technology (Wuhan) Co., Ltd.";

export const LANDING_DISCLOSURE =
  "This website is operated by Meet Technology (Wuhan) Co., Ltd., an independent professional service provider for national talent programs. It is not an official government website and is not affiliated with any government authority.";

export const LANDING_PRIMARY_CTA = {
  label: "Start Your Application",
  href: "/signup",
} as const;

export const LANDING_NAV_ITEMS = [
  { label: "Programs", href: "#programs" },
  { label: "Benefits", href: "#benefits" },
  { label: "Eligibility", href: "#eligibility" },
  { label: "Process", href: "#process" },
  { label: "FAQ", href: "#faq" },
] as const;

export const LANDING_HERO = {
  eyebrow: "2027 Application Cycle · Pre-applications Open Year-Round",
  title: "The Global Excellent Scientists Fund",
  lede: "A national-level talent program inviting overseas scholars — including those from Hong Kong, Macau, and Taiwan, regardless of nationality — to conduct research and innovation in China. Preparations for the 2027 application cycle are now underway, and we recommend beginning your preparations early.",
  primaryCta: LANDING_PRIMARY_CTA,
  secondaryCta: {
    label: "Check Your Eligibility",
    href: "#eligibility",
  },
} as const;

export const LANDING_STATS = [
  { value: "10+", label: "Years of experience" },
  {
    value: "200+",
    label: "Cities and industrial parks served across 28 provinces",
  },
  { value: "5,000+", label: "Overseas experts supported" },
] as const;

export const LANDING_PROGRAMS_SECTION = {
  eyebrow: "Sub-programs",
  title: "Three tracks into the fund",
  // `code` is the program's common abbreviation, rendered as a large decorative
  // monogram on each card: QM = Qiming (启明), HJ = Torch (火炬), CJ = Changjiang (长江).
  items: [
    {
      code: "QM",
      name: "Qiming Plan",
      description:
        "A GESF sub-program for overseas research talents, connecting scholars with Chinese universities and research institutes as host platforms.",
    },
    {
      code: "HJ",
      name: "Torch Plan",
      description:
        "A GESF sub-program oriented toward innovation and engineering, linking experts with enterprises and industrial platforms across China.",
    },
    {
      code: "CJ",
      name: "Changjiang Scholar",
      description:
        "A prestigious academic appointment program for distinguished scholars taking up positions at Chinese universities.",
    },
  ],
} as const;

export const LANDING_BENEFITS_SECTION = {
  eyebrow: "Benefits",
  title: "A competitive national package",
  items: [
    "Annual Salary: ¥500K – ¥2M RMB (negotiable)",
    "Talent Reward: ¥1.5M – ¥6M RMB (paid over 3–5 years)",
    "Comprehensive Benefits: Including housing subsidies, children's school enrollment support, tax benefits",
    'Title: the prestigious "National High-Level Talent" title.',
  ],
  disclaimer:
    "Figures vary by program and host institution; final packages follow official policies.",
} as const;

export const LANDING_ELIGIBILITY_SECTION = {
  eyebrow: "Eligibility",
  title: "Who can apply",
  intro:
    "Applicants must meet at least one of the following three sets of criteria.",
  note: "The three sets of criteria are not mutually exclusive; a candidate can meet more than one category, and this does not affect their eligibility.",
  categories: [
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
  ],
} as const;

export const LANDING_PROCESS_SECTION = {
  eyebrow: "Process",
  title: "From first click to official submission",
  steps: [
    {
      title: "Create your account",
      description:
        "Register with your email to open your application workspace.",
    },
    {
      title: "Submit your CV",
      description:
        "Our team reviews your background against the eligibility criteria and current program priorities.",
    },
    {
      title: "Upload required documents",
      description:
        "We guide you through achievement certificates, recommendation letters, and every supporting material.",
    },
    {
      title: "Official submission",
      description:
        "During the official window, we assist you in submitting the formal application to the official authorities.",
    },
  ],
  timeline: [
    {
      title: "Year-round acceptance",
      description:
        "Pre-applications are accepted throughout the year; early preparation is strongly recommended.",
    },
    {
      title: "Official window: Jan – May",
      description:
        "The official submission window is tentatively scheduled from January to May each year, subject to annual adjustments.",
    },
    {
      title: "Results in December",
      description:
        "Final selection results are announced in December of the same year.",
    },
    {
      title: "Two-year preparation period",
      description:
        "Selected candidates may flexibly plan their move to China and choose full-time or part-time employment.",
    },
  ],
} as const;

export const LANDING_ABOUT_SECTION = {
  eyebrow: "About our service",
  title: "Full-process support, from materials to onboarding",
  whoWeAre:
    "Meet Technology (Wuhan) Co., Ltd. is a talent consulting company which integrates global top talents, technology projects, venture capital, industrial parks, research institutes and listed companies and other elements of science and technology innovation to promote high-quality urban development.",
  coreServices: [
    {
      title: "Material Preparation",
      description:
        "A professional team assists you in collating application materials including resumes, achievement certificates, and recommendation letters, so your documents meet national requirements and stay competitive.",
    },
    {
      title: "Platform Matching",
      description:
        "We match you with competitive Chinese universities, research institutions and enterprises as your application platform — the program requires candidates to apply jointly with a platform.",
    },
    {
      title: "Post-selection Support",
      description:
        "Upon successful selection, we assist you in coordinating with local governments and affiliated platforms, facilitate onboarding, secure incentive and subsidy funds, and obtain the national-level talent honor title.",
    },
  ],
  valueAddedServices: [
    "Academic Exchange",
    "Conferences & Forums",
    "Technology Transfer",
    "Entrepreneurial Financing & Client Development",
  ],
  contact: {
    email: SUBMISSION_COMPLETE_CONTACT_EMAIL,
    whatsappDisplay: "+86 173 6330 7362",
    whatsappUrl: "https://wa.me/8617363307362",
  },
} as const;

export const LANDING_FAQ_SECTION = {
  eyebrow: "FAQ",
  title: "Questions, answered",
} as const;

export const LANDING_FINAL_CTA = {
  eyebrow: "2027 Application Cycle",
  title: "Begin your pre-application today",
  body: "The volume of required documents is large, and early preparation makes the difference. Create an account to start your CV submission — progress is saved at every stage.",
  cta: LANDING_PRIMARY_CTA,
} as const;

export const LANDING_FOOTER = {
  companyName: LANDING_COMPANY_NAME,
  disclosure: LANDING_DISCLOSURE,
  applyEntryLink: {
    label: "Have an invitation link? Continue your application",
    href: "/apply",
  },
  contact: LANDING_ABOUT_SECTION.contact,
} as const;
