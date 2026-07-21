import type { InvitationGenerationBatchSummary } from "@/lib/invitations/types";

type GenerateResponse = {
  readonly batch: InvitationGenerationBatchSummary;
};

const GENERATION_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  OPS_SESSION_REQUIRED: "需要有效的运营后台登录会话。",
  OPS_EXPERT_FILES_SESSION_REQUIRED: "需要有效的运营后台登录会话。",
  INVITATION_GENERATION_INVALID_PAYLOAD: "邀请链接生成请求参数无效。",
  INVITATION_GENERATION_IDEMPOTENCY_CONFLICT: "幂等键已用于不同的生成设置。",
};

function isGenerateResponse(value: unknown): value is GenerateResponse {
  if (typeof value !== "object" || value === null || !("batch" in value)) {
    return false;
  }

  const batch = value.batch;

  return typeof batch === "object" && batch !== null;
}

async function readResponseJson(response: Response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  const body = await response.text();

  if (!body.trim()) {
    return null;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function readErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload !== "object" || payload === null || !("code" in payload)) {
    return fallback;
  }

  const code = payload.code;
  return typeof code === "string"
    ? (GENERATION_ERROR_MESSAGES[code] ?? fallback)
    : fallback;
}

function getGenerationFailureMessage(payload: unknown, status: number) {
  const fallback = status
    ? `邀请链接生成失败（HTTP ${status}）。`
    : "邀请链接生成失败。";

  return readErrorMessage(payload, fallback);
}

export async function readGenerateResponse(response: Response) {
  const payload = await readResponseJson(response);

  if (!response.ok || !isGenerateResponse(payload)) {
    throw new Error(getGenerationFailureMessage(payload, response.status));
  }

  return payload;
}
