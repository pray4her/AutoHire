import { createId } from "@/lib/ops-expert-files/id";
import { hashPassword, verifyPassword } from "@/lib/ops-expert-files/password";
import {
  createOpsExpertFilesCookie,
  createOpsExpertFilesOperatorDigest,
  getOpsExpertFilesUsername,
  peekOpsExpertFilesSession,
} from "@/lib/ops-expert-files/session";
import { getEnv, getRuntimeMode } from "@/lib/env";

export class OpsExpertFilesAuthError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = "OPS_EXPERT_FILES_AUTH_ERROR") {
    super(message);
    this.name = "OpsExpertFilesAuthError";
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
  var __autohireOpsExpertFilesAccounts: AccountRecord[] | undefined;
}

function getMemoryAccounts() {
  if (!globalThis.__autohireOpsExpertFilesAccounts) {
    globalThis.__autohireOpsExpertFilesAccounts = [];
  }
  return globalThis.__autohireOpsExpertFilesAccounts;
}

async function findAccountByUsername(username: string) {
  if (getRuntimeMode() === "memory") {
    return getMemoryAccounts().find((account) => account.username === username) ?? null;
  }

  const { prisma } = await import("@/lib/db/prisma");
  return prisma.opsExpertFilesAccount.findUnique({ where: { username } });
}

async function createAccount(input: {
  username: string;
  passwordHash: string;
}) {
  const now = new Date();
  const record: AccountRecord = {
    id: createId("ops_ef_acct"),
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
  return prisma.opsExpertFilesAccount.create({
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
  return prisma.opsExpertFilesAccount.update({
    where: { username: input.username },
    data: {
      passwordHash: input.passwordHash,
      passwordVersion: input.nextPasswordVersion,
    },
  });
}

async function ensureAccountExists() {
  const username = getOpsExpertFilesUsername();
  const existing = await findAccountByUsername(username);
  if (existing) {
    return existing;
  }

  const initialPassword = getEnv().OPS_EXPERT_FILES_INITIAL_PASSWORD;
  if (!initialPassword) {
    throw new OpsExpertFilesAuthError(
      "专家档案账号尚未初始化，请配置 OPS_EXPERT_FILES_INITIAL_PASSWORD。",
      503,
      "OPS_EXPERT_FILES_ACCOUNT_NOT_INITIALIZED",
    );
  }

  return createAccount({
    username,
    passwordHash: await hashPassword(initialPassword),
  });
}

export async function loginOpsExpertFiles(input: {
  username: string;
  password: string;
}) {
  const expectedUsername = getOpsExpertFilesUsername();
  if (input.username !== expectedUsername) {
    throw new OpsExpertFilesAuthError(
      "用户名或密码错误。",
      401,
      "OPS_EXPERT_FILES_INVALID_CREDENTIALS",
    );
  }

  const account = await ensureAccountExists();
  const valid = await verifyPassword(input.password, account.passwordHash);
  if (!valid) {
    throw new OpsExpertFilesAuthError(
      "用户名或密码错误。",
      401,
      "OPS_EXPERT_FILES_INVALID_CREDENTIALS",
    );
  }

  return {
    username: account.username,
    passwordVersion: account.passwordVersion,
    cookieValue: createOpsExpertFilesCookie({
      username: account.username,
      passwordVersion: account.passwordVersion,
    }),
    operatorDigest: createOpsExpertFilesOperatorDigest(account.username),
  };
}

export async function verifyOpsExpertFilesSession(
  cookieValue: string | undefined | null,
) {
  const payload = peekOpsExpertFilesSession(cookieValue);
  if (!payload) {
    return null;
  }

  if (payload.username !== getOpsExpertFilesUsername()) {
    return null;
  }

  const account = await findAccountByUsername(payload.username);
  if (!account || account.passwordVersion !== payload.passwordVersion) {
    return null;
  }

  return {
    username: account.username,
    passwordVersion: account.passwordVersion,
    operatorDigest: createOpsExpertFilesOperatorDigest(account.username),
  };
}

export async function changeOpsExpertFilesPassword(input: {
  cookieValue: string | undefined | null;
  currentPassword: string;
  newPassword: string;
}) {
  if (input.newPassword.length < 8) {
    throw new OpsExpertFilesAuthError(
      "新密码至少 8 位。",
      400,
      "OPS_EXPERT_FILES_PASSWORD_TOO_SHORT",
    );
  }

  if (input.newPassword === input.currentPassword) {
    throw new OpsExpertFilesAuthError(
      "新密码不能与当前密码相同。",
      400,
      "OPS_EXPERT_FILES_PASSWORD_UNCHANGED",
    );
  }

  const session = await verifyOpsExpertFilesSession(input.cookieValue);
  if (!session) {
    throw new OpsExpertFilesAuthError(
      "需要有效的运营后台登录会话。",
      401,
      "OPS_EXPERT_FILES_SESSION_REQUIRED",
    );
  }

  const account = await findAccountByUsername(session.username);
  if (!account) {
    throw new OpsExpertFilesAuthError(
      "需要有效的运营后台登录会话。",
      401,
      "OPS_EXPERT_FILES_SESSION_REQUIRED",
    );
  }

  const valid = await verifyPassword(input.currentPassword, account.passwordHash);
  if (!valid) {
    throw new OpsExpertFilesAuthError(
      "当前密码不正确。",
      401,
      "OPS_EXPERT_FILES_INVALID_CURRENT_PASSWORD",
    );
  }

  const nextPasswordVersion = account.passwordVersion + 1;
  const updated = await updateAccountPassword({
    username: account.username,
    passwordHash: await hashPassword(input.newPassword),
    nextPasswordVersion,
  });

  if (!updated) {
    throw new OpsExpertFilesAuthError(
      "修改密码失败。",
      500,
      "OPS_EXPERT_FILES_PASSWORD_UPDATE_FAILED",
    );
  }

  return {
    username: updated.username,
    passwordVersion: updated.passwordVersion,
    cookieValue: createOpsExpertFilesCookie({
      username: updated.username,
      passwordVersion: updated.passwordVersion,
    }),
    operatorDigest: createOpsExpertFilesOperatorDigest(updated.username),
  };
}

export function resetOpsExpertFilesAccountsForTests() {
  if (process.env.NODE_ENV !== "test") {
    return;
  }
  globalThis.__autohireOpsExpertFilesAccounts = [];
}
