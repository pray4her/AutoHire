import { getRuntimeMode } from "@/lib/env";
import type { CreateQaFaqEntryInput, QaFaqEntry } from "@/features/qa/types";

type MemoryQaFaqStore = {
  qaFaqEntries: QaFaqEntry[];
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

function getMemoryStore(): MemoryQaFaqStore {
  const globalStore = globalThis as typeof globalThis & {
    __autohireQaFaqStore?: MemoryQaFaqStore;
  };

  if (!globalStore.__autohireQaFaqStore) {
    globalStore.__autohireQaFaqStore = {
      qaFaqEntries: [],
    };
  }

  return globalStore.__autohireQaFaqStore;
}

async function getPrisma() {
  const { prisma } = await import("@/lib/db/prisma");
  return prisma;
}

type ApplicationFaqDelegate = {
  findMany: (input: {
    where: { isPublished: boolean };
    orderBy: readonly [
      { sortOrder: "asc" | "desc" },
      { createdAt: "asc" | "desc" },
    ];
  }) => Promise<
    Array<{
      id: string;
      slug: string;
      question: string;
      answer: string;
      keywords: string[];
      sortOrder: number;
      isPublished: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>
  >;
  create: (input: {
    data: {
      slug: string;
      question: string;
      answer: string;
      keywords: readonly string[];
      sortOrder: number;
      isPublished: boolean;
    };
  }) => Promise<{
    id: string;
    slug: string;
    question: string;
    answer: string;
    keywords: string[];
    sortOrder: number;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

function isApplicationFaqDelegate(value: unknown): value is ApplicationFaqDelegate {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "findMany" in value &&
    typeof value.findMany === "function" &&
    "create" in value &&
    typeof value.create === "function"
  );
}

function getApplicationFaqDelegate(prisma: unknown) {
  const delegate = Reflect.get(prisma as object, "applicationFaqEntry");

  if (!isApplicationFaqDelegate(delegate)) {
    return null;
  }

  return delegate;
}

function mapPrismaQaFaqEntry(record: {
  id: string;
  slug: string;
  question: string;
  answer: string;
  keywords: string[];
  sortOrder: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}): QaFaqEntry {
  return {
    ...record,
    keywords: [...record.keywords],
  };
}

export async function listPublishedQaFaqEntries(): Promise<
  readonly QaFaqEntry[]
> {
  if (getRuntimeMode() === "memory") {
    return [...getMemoryStore().qaFaqEntries]
      .filter((entry) => entry.isPublished)
      .sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }

        return left.createdAt.getTime() - right.createdAt.getTime();
      });
  }

  const prisma = await getPrisma();
  const delegate = getApplicationFaqDelegate(prisma);

  if (!delegate) {
    return [];
  }

  const records = await delegate.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return records.map(mapPrismaQaFaqEntry);
}

export async function createQaFaqEntry(
  input: CreateQaFaqEntryInput,
): Promise<QaFaqEntry> {
  const normalized = {
    slug: input.slug.trim(),
    question: input.question.trim(),
    answer: input.answer.trim(),
    keywords: input.keywords
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0),
    sortOrder: input.sortOrder ?? 100,
    isPublished: input.isPublished ?? true,
  };

  if (getRuntimeMode() === "memory") {
    const store = getMemoryStore();

    if (store.qaFaqEntries.some((entry) => entry.slug === normalized.slug)) {
      throw new Error("A QA FAQ entry with this slug already exists.");
    }

    const now = new Date();
    const record: QaFaqEntry = {
      id: createId("faq"),
      slug: normalized.slug,
      question: normalized.question,
      answer: normalized.answer,
      keywords: normalized.keywords,
      sortOrder: normalized.sortOrder,
      isPublished: normalized.isPublished,
      createdAt: now,
      updatedAt: now,
    };

    store.qaFaqEntries.push(record);
    return record;
  }

  const prisma = await getPrisma();
  const delegate = getApplicationFaqDelegate(prisma);

  if (!delegate) {
    throw new Error(
      "Application FAQ delegate is unavailable. Restart the dev server after regenerating Prisma Client.",
    );
  }

  const record = await delegate.create({
    data: normalized,
  });

  return mapPrismaQaFaqEntry(record);
}

export function resetQaFaqStoreForTests() {
  if (process.env.NODE_ENV !== "test") {
    return;
  }

  const globalStore = globalThis as typeof globalThis & {
    __autohireQaFaqStore?: MemoryQaFaqStore;
  };

  globalStore.__autohireQaFaqStore = undefined;
}
