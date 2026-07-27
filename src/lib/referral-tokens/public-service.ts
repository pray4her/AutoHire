import { buildApplicationSnapshot } from "@/lib/data/store";
import { log } from "@/lib/logger";
import {
  findReferralTokenByHash,
  recordReferralClick,
  type ReferralClickAccessResult,
} from "@/lib/referral-tokens/public-repository";
import {
  publicReferralTokenSchema,
  type ReferralDisplayField,
} from "@/lib/referral-tokens/schemas";
import { hashReferralToken } from "@/lib/referral-tokens/token";

type ReferralExpertProfile = {
  readonly name: string;
  readonly title?: string;
  readonly organization?: string;
  readonly email?: string;
  readonly phone?: string;
};

export type PublicReferralResult =
  | {
      readonly status: "VALID";
      readonly expert: ReferralExpertProfile;
    }
  | { readonly status: "UNAVAILABLE" };

export type ReferralRequestContext = {
  readonly ipRaw: string | null;
  readonly userAgent: string | null;
};

type RequestHeaders = {
  get(name: string): string | null;
};

const PROFILE_FIELD_ALIASES = {
  name: ["*Full Name", "*姓名", "姓名", "name", "full_name", "fullName"],
  title: [
    "Current Title",
    "current_title",
    "currentTitle",
    "current_title_equivalence",
  ],
  organization: [
    "Current Employer (Chinese)",
    "Current Employer (English)",
    "当前工作单位",
    "就职单位中文",
    "current_employer",
    "currentEmployer",
    "employer_cn",
    "employerCn",
    "employer_en",
    "employerEn",
  ],
  personalEmail: ["Personal Email (Unique)", "个人邮箱", "personal_email"],
  workEmail: ["Work Email (Unique)", "工作邮箱", "work_email"],
  phone: ["Mobile Number (Unique)", "手机号", "phone_number"],
} as const;

function firstText(
  source: Readonly<Record<string, unknown>>,
  aliases: readonly string[],
): string | null {
  for (const alias of aliases) {
    const value = source[alias];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function isDisplayed(
  fields: readonly ReferralDisplayField[],
  field: ReferralDisplayField,
): boolean {
  return fields.includes(field);
}

export function referralRequestContextFromHeaders(
  headers: RequestHeaders,
): ReferralRequestContext {
  const forwardedIp = headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return {
    ipRaw: forwardedIp || headers.get("x-real-ip")?.trim() || null,
    userAgent: headers.get("user-agent"),
  };
}

async function recordReferralClickSafely(input: {
  readonly referralTokenId: string | null;
  readonly tokenHash: string;
  readonly accessResult: ReferralClickAccessResult;
  readonly ipRaw: string | null;
  readonly userAgent: string | null;
}): Promise<void> {
  try {
    await recordReferralClick(input);
  } catch (error) {
    log("error", "Failed to record referral click", {
      accessResult: input.accessResult,
      error: error instanceof Error ? error.message : String(error),
      tokenHash: input.tokenHash,
    });
  }
}

export async function resolvePublicReferral(
  plaintextToken: string,
  context: ReferralRequestContext,
): Promise<PublicReferralResult> {
  const tokenHash = hashReferralToken(plaintextToken);
  const parsedToken = publicReferralTokenSchema.safeParse(plaintextToken);
  const token = parsedToken.success
    ? await findReferralTokenByHash(tokenHash)
    : null;
  const finish = async (
    result: PublicReferralResult,
    accessResult: ReferralClickAccessResult,
  ): Promise<PublicReferralResult> => {
    await recordReferralClickSafely({
      referralTokenId: token?.id ?? null,
      tokenHash,
      accessResult,
      ipRaw: context.ipRaw,
      userAgent: context.userAgent,
    });
    return result;
  };

  if (!token) {
    return finish({ status: "UNAVAILABLE" }, "INVALID");
  }
  if (token.status === "DISABLED") {
    return finish({ status: "UNAVAILABLE" }, "DISABLED");
  }
  if (token.expiredAt.getTime() <= Date.now()) {
    return finish({ status: "UNAVAILABLE" }, "EXPIRED");
  }

  const application = await buildApplicationSnapshot(token.applicationId);
  if (!application) {
    return finish({ status: "UNAVAILABLE" }, "INVALID");
  }

  const extractedFields = {
    ...(application.latestExtractionReview?.extractedFields ?? {}),
    ...(application.latestResult?.extractedFields ?? {}),
  };
  const name =
    application.screeningPassportFullName ??
    firstText(extractedFields, PROFILE_FIELD_ALIASES.name) ??
    "一位 GESF 专家";
  const title = firstText(extractedFields, PROFILE_FIELD_ALIASES.title);
  const organization = firstText(
    extractedFields,
    PROFILE_FIELD_ALIASES.organization,
  );
  const email =
    application.screeningContactEmail ??
    application.screeningWorkEmail ??
    firstText(extractedFields, PROFILE_FIELD_ALIASES.personalEmail) ??
    firstText(extractedFields, PROFILE_FIELD_ALIASES.workEmail);
  const phone =
    application.screeningPhoneNumber ??
    firstText(extractedFields, PROFILE_FIELD_ALIASES.phone);

  return finish(
    {
      status: "VALID",
      expert: {
        name,
        ...(isDisplayed(token.displayFields, "TITLE") && title
          ? { title }
          : {}),
        ...(isDisplayed(token.displayFields, "ORGANIZATION") && organization
          ? { organization }
          : {}),
        ...(isDisplayed(token.displayFields, "EMAIL") && email
          ? { email }
          : {}),
        ...(isDisplayed(token.displayFields, "PHONE") && phone
          ? { phone }
          : {}),
      },
    },
    "VALID",
  );
}
