/**
 * Backfill Application.customerNo for historical rows that already have resumeUploadedAt.
 *
 * Rules (aligned with product decisions):
 * - Only rows with resumeUploadedAt IS NOT NULL and customerNo IS NULL
 * - Date key = Asia/Shanghai calendar day of resumeUploadedAt (YYYYMMDD)
 * - Within a day, order by resumeUploadedAt ASC, then id ASC
 * - Sequence continues after any existing customerNo already issued that day
 * - Sync CustomerNoDailyCounter.lastSeq to the max seq used that day
 * - Days exceeding 99 assignments fail for the overflow rows (logged)
 *
 * Usage:
 *   bun scripts/backfill-customer-no.ts
 *   bun scripts/backfill-customer-no.ts --dry-run
 */
import { CUSTOMER_NO_MAX_DAILY_SEQ } from "../src/lib/ops-expert-files/constants";
import {
  buildCustomerNo,
  formatShanghaiDateKey,
} from "../src/lib/ops-expert-files/time";

function parseSeqFromCustomerNo(customerNo: string, dateKey: string) {
  if (!customerNo.startsWith(dateKey) || customerNo.length !== 12) {
    return null;
  }
  const seq = Number(customerNo.slice(8, 10));
  if (!Number.isInteger(seq) || seq < 1 || seq > CUSTOMER_NO_MAX_DAILY_SEQ) {
    return null;
  }
  return seq;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  process.env.APP_RUNTIME_MODE = process.env.APP_RUNTIME_MODE || "prisma";

  const { prisma } = await import("../src/lib/db/prisma");

  const pending = await prisma.application.findMany({
    where: {
      resumeUploadedAt: { not: null },
      customerNo: null,
    },
    select: {
      id: true,
      resumeUploadedAt: true,
    },
    orderBy: [{ resumeUploadedAt: "asc" }, { id: "asc" }],
  });

  console.log(
    `[backfill-customer-no] pending=${pending.length} dryRun=${dryRun}`,
  );

  if (pending.length === 0) {
    return;
  }

  const byDate = new Map<
    string,
    Array<{ id: string; resumeUploadedAt: Date }>
  >();

  for (const row of pending) {
    if (!row.resumeUploadedAt) {
      continue;
    }
    const dateKey = formatShanghaiDateKey(row.resumeUploadedAt);
    const list = byDate.get(dateKey) ?? [];
    list.push({ id: row.id, resumeUploadedAt: row.resumeUploadedAt });
    byDate.set(dateKey, list);
  }

  let assigned = 0;
  let skippedQuota = 0;
  const overflowDays: string[] = [];

  for (const [dateKey, rows] of [...byDate.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const existing = await prisma.application.findMany({
      where: {
        customerNo: { startsWith: dateKey },
      },
      select: { customerNo: true },
    });

    let nextSeq =
      existing.reduce((max, item) => {
        const seq = item.customerNo
          ? parseSeqFromCustomerNo(item.customerNo, dateKey)
          : null;
        return seq && seq > max ? seq : max;
      }, 0) + 1;

    console.log(
      `[day ${dateKey}] pending=${rows.length} startSeq=${nextSeq}`,
    );

    for (const row of rows) {
      if (nextSeq > CUSTOMER_NO_MAX_DAILY_SEQ) {
        skippedQuota += 1;
        if (!overflowDays.includes(dateKey)) {
          overflowDays.push(dateKey);
        }
        console.warn(
          `  SKIP ${row.id} — daily quota exceeded (>${CUSTOMER_NO_MAX_DAILY_SEQ})`,
        );
        continue;
      }

      const customerNo = buildCustomerNo(dateKey, nextSeq);
      console.log(
        `  ${dryRun ? "DRY" : "SET"} ${row.id} -> ${customerNo} (resumeUploadedAt=${row.resumeUploadedAt.toISOString()})`,
      );

      if (!dryRun) {
        await prisma.application.update({
          where: { id: row.id },
          data: { customerNo },
        });
      }

      assigned += 1;
      nextSeq += 1;
    }

    const finalSeq = nextSeq - 1;
    if (finalSeq > 0) {
      console.log(
        `  counter ${dateKey} lastSeq=${finalSeq}${dryRun ? " (dry-run, not written)" : ""}`,
      );
      if (!dryRun) {
        await prisma.customerNoDailyCounter.upsert({
          where: { dateKey },
          create: { dateKey, lastSeq: finalSeq },
          update: { lastSeq: finalSeq },
        });
      }
    }
  }

  console.log(
    `[backfill-customer-no] done assigned=${assigned} skippedQuota=${skippedQuota} overflowDays=${overflowDays.join(",") || "-"}`,
  );

  if (!dryRun) {
    const withNo = await prisma.application.count({
      where: { customerNo: { not: null } },
    });
    console.log(`[backfill-customer-no] applications with customerNo now=${withNo}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      const { prisma } = await import("../src/lib/db/prisma");
      await prisma.$disconnect();
    } catch {
      // ignore
    }
  });
