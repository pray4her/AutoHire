import { createId } from "@/lib/ops-expert-files/id";
import { hashPassword, verifyPassword } from "@/lib/ops-expert-files/password";
import {
  createOpsReferralCookie,
  createOpsReferralOperatorDigest,
  isAllowedOpsReferralUsername,
  peekOpsReferralSession,
} from "@/lib/ops-referral-auth/session";
import { getEnv, getRuntimeMode } from "@/lib/env";

export class OpsReferralAuthError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = "OPS_REFERRAL_AUTH_ERROR") {
    super(message);
    this.name = "OpsReferralAuthError";
    this.status = status;
    this.code = code;
  }
}

type AccountRecord = {
  id: string;
  username: string;
  passwordHash: string;
  passwordVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

declare global {
  // eslint-disable-next-line no-var
  var __autohireOpsReferralAccounts: AccountRecord[] | undefined;
}

function getMemoryAccounts() {
  if (!globalThis.__autohireOpsReferralAccounts) {
    globalThis.__autohireOpsReferralAccounts = [];
  }
  return globalThis.__autohireOpsReferralAccounts;
}

async function findAccountByUsername(username: string) {
  if (getRuntimeMode() === "memory") {
    return getMemoryAccounts().find((account) => account.username === username) ?? null;
  }

  const { prisma } = await import("@/lib/db/prisma");
  return prisma.opsReferralAccount.findUnique({ where: { username } });
}

async function createAccount(input: {
  username: string;
  passwordHash: string;
}) {
  const now = new Date();
  const record: AccountRecord = {
    id: createId("ops_ref_acct"),
    username: input.username,
    passwordHash: input.passwordHash,
    passwordVersion: 1,
    createdAt: now,
    updatedAt: now,
  };

  if (getRuntimeMode() === "memory") {
    getMemoryAccounts().push(record);
    return record;
  }

  const { prisma } = await import("@/lib/db/prisma");
  return prisma.opsReferralAccount.create({
    data: {
      id: record.id,
      username: record.username,
      passwordHash: record.passwordHash,
      passwordVersion: record.passwordVersion,
    },
  });
}

async function updateAccountPassword(input: {
  username: string;
  passwordHash: string;
  nextPasswordVersion: number;
}) {
  if (getRuntimeMode() === "memory") {
    const account = getMemoryAccounts().find(
      (item) => item.username === input.username,
    );
    if (!account) {
      return null;
    }
    account.passwordHash = input.passwordHash;
    account.passwordVersion = input.nextPasswordVersion;
    account.updatedAt = new Date();
    return account;
  }

  const { prisma } = await import("@/lib/db/prisma");
  return prisma.opsReferralAccount.update({
    where: { username: input.username },
    data: {
      passwordHash: input.passwordHash,
      passwordVersion: input.nextPasswordVersion,
    },
  });
}

async function ensureAccountExists(username: string) {
  const existing = await findAccountByUsername(username);
  if (existing) {
    return existing;
  }

  const initialPassword = getEnv().OPS_REFERRAL_INITIAL_PASSWORD;
  if (!initialPassword) {
    throw new OpsReferralAuthError(
      "推荐后台账号尚未初始化，请配置 OPS_REFERRAL_INITIAL_PASSWORD。",
      503,
      "OPS_REFERRAL_ACCOUNT_NOT_INITIALIZED",
    );
  }

  return createAccount({
    username,
    passwordHash: await hashPassword(initialPassword),
  });
}

export async function loginOpsReferral(input: {
  username: string;
  password: string;
}) {
  if (!isAllowedOpsReferralUsername(input.username)) {
    throw new OpsReferralAuthError(
      "用户名或密码错误。",
      401,
      "OPS_REFERRAL_INVALID_CREDENTIALS",
    );
  }

  const account = await ensureAccountExists(input.username);
  const valid = await verifyPassword(input.password, account.passwordHash);
  if (!valid) {
    throw new OpsReferralAuthError(
      "用户名或密码错误。",
      401,
      "OPS_REFERRAL_INVALID_CREDENTIALS",
    );
  }

  return {
    username: account.username,
    passwordVersion: account.passwordVersion,
    cookieValue: createOpsReferralCookie({
      username: account.username,
      passwordVersion: account.passwordVersion,
    }),
    operatorDigest: createOpsReferralOperatorDigest(account.username),
  };
}

export async function verifyOpsReferralSession(
  cookieValue: string | undefined | null,
) {
  const payload = peekOpsReferralSession(cookieValue);
  if (!payload) {
    return null;
  }

  if (!isAllowedOpsReferralUsername(payload.username)) {
    return null;
  }

  const account = await findAccountByUsername(payload.username);
  if (!account || account.passwordVersion !== payload.passwordVersion) {
    return null;
  }

  return {
    username: account.username,
    passwordVersion: account.passwordVersion,
    operatorDigest: createOpsReferralOperatorDigest(account.username),
  };
}

export async function changeOpsReferralPassword(input: {
  cookieValue: string | undefined | null;
  currentPassword: string;
  newPassword: string;
}) {
  if (input.newPassword.length < 8) {
    throw new OpsReferralAuthError(
      "新密码至少 8 位。",
      400,
      "OPS_REFERRAL_PASSWORD_TOO_SHORT",
    );
  }

  if (input.newPassword === input.currentPassword) {
    throw new OpsReferralAuthError(
      "新密码不能与当前密码相同。",
      400,
      "OPS_REFERRAL_PASSWORD_UNCHANGED",
    );
  }

  const session = await verifyOpsReferralSession(input.cookieValue);
  if (!session) {
    throw new OpsReferralAuthError(
      "需要有效的推荐后台登录会话。",
      401,
      "OPS_REFERRAL_SESSION_REQUIRED",
    );
  }

  const account = await findAccountByUsername(session.username);
  if (!account) {
    throw new OpsReferralAuthError(
      "需要有效的推荐后台登录会话。",
      401,
      "OPS_REFERRAL_SESSION_REQUIRED",
    );
  }

  const valid = await verifyPassword(input.currentPassword, account.passwordHash);
  if (!valid) {
    throw new OpsReferralAuthError(
      "当前密码不正确。",
      401,
      "OPS_REFERRAL_INVALID_CURRENT_PASSWORD",
    );
  }

  const nextPasswordVersion = account.passwordVersion + 1;
  const updated = await updateAccountPassword({
    username: account.username,
    passwordHash: await hashPassword(input.newPassword),
    nextPasswordVersion,
  });

  if (!updated) {
    throw new OpsReferralAuthError(
      "修改密码失败。",
      500,
      "OPS_REFERRAL_PASSWORD_UPDATE_FAILED",
    );
  }

  return {
    username: updated.username,
    passwordVersion: updated.passwordVersion,
    cookieValue: createOpsReferralCookie({
      username: updated.username,
      passwordVersion: updated.passwordVersion,
    }),
    operatorDigest: createOpsReferralOperatorDigest(updated.username),
  };
}

export function resetOpsReferralAccountsForTests() {
  if (process.env.NODE_ENV !== "test") {
    return;
  }
  globalThis.__autohireOpsReferralAccounts = [];
}
