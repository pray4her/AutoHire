import { listExpertFiles } from "@/lib/ops-expert-files/query";

const REFERRAL_EXPERT_HISTORY_START = "1970-01-01";
const REFERRAL_EXPERT_HISTORY_END = "2999-12-31";

export type ReferralExpertSearchItem = {
  readonly applicationId: string;
  readonly expertId: string;
  readonly customerNo: string;
  readonly name: string | null;
  readonly email: string | null;
};

export async function listReferralExpertOptions(
  query: string,
): Promise<readonly ReferralExpertSearchItem[]> {
  const experts = await listExpertFiles({
    q: query,
    status: "all",
    source: "all",
    startDate: REFERRAL_EXPERT_HISTORY_START,
    endDate: REFERRAL_EXPERT_HISTORY_END,
    page: 1,
    pageSize: 100,
  });

  return experts.items.map((expert) => ({
    applicationId: expert.applicationId,
    expertId: expert.expertId,
    customerNo: expert.customerNo,
    name: expert.screeningPassportFullName,
    email:
      expert.screeningContactEmail ??
      expert.screeningWorkEmail ??
      expert.invitationEmail,
  }));
}
