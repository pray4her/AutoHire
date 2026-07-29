/**
 * Backfill Extraction Export workbooks so `抽取结果.xlsx` includes the
 * `supplement_requests` sheet (latest Supplement Requests).
 *
 * Requires FILE_STORAGE_MODE=oss and a real DATABASE_URL (prisma runtime).
 * Bun loads repo-root `.env` automatically; the PowerShell wrapper also
 * injects `.env` into the process environment.
 *
 * Usage (repo root):
 *   bun scripts/backfill-extraction-export-supplement-requests.ts
 *   bun scripts/backfill-extraction-export-supplement-requests.ts --dry-run
 *   bun scripts/backfill-extraction-export-supplement-requests.ts --limit 10
 *   bun scripts/backfill-extraction-export-supplement-requests.ts --application-id app_xxx
 *
 * PowerShell:
 *   .\scripts\backfill-extraction-export-supplement-requests.ps1
 *   .\scripts\backfill-extraction-export-supplement-requests.ps1 -DryRun
 *   .\scripts\backfill-extraction-export-supplement-requests.ps1 -Limit 20
 *   .\scripts\backfill-extraction-export-supplement-requests.ps1 -ApplicationId app_xxx
 */
import { getEnv, getRuntimeMode } from "../src/lib/env";
import { exportConfirmedExtractionWorkbook } from "../src/lib/extraction-export/orchestrator";

function readFlag(name: string) {
  return process.argv.includes(name);
}

function readOption(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function collectApplicationIds() {
  const ids: string[] = [];
  for (let i = 0; i < process.argv.length; i += 1) {
    if (process.argv[i] === "--application-id" && process.argv[i + 1]) {
      ids.push(process.argv[i + 1]!);
    }
  }
  return ids;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const dryRun = readFlag("--dry-run");
  const limitRaw = readOption("--limit");
  const limit = limitRaw ? Number(limitRaw) : null;
  const onlyIds = collectApplicationIds();

  if (limitRaw && (!limit || !Number.isInteger(limit) || limit < 1)) {
    throw new Error("--limit must be a positive integer.");
  }

  process.env.APP_RUNTIME_MODE = process.env.APP_RUNTIME_MODE || "prisma";

  const env = getEnv();
  if (getRuntimeMode() !== "prisma") {
    throw new Error(
      `APP_RUNTIME_MODE must resolve to prisma (got ${getRuntimeMode()}). Set DATABASE_URL / APP_RUNTIME_MODE=prisma.`,
    );
  }

  if (env.FILE_STORAGE_MODE !== "oss") {
    throw new Error(
      "FILE_STORAGE_MODE must be oss (Extraction Export writes to OSS).",
    );
  }

  const { prisma } = await import("../src/lib/db/prisma");

  const rows = await prisma.application.findMany({
    where: {
      customerNo: { not: null },
      ...(onlyIds.length > 0
        ? { id: { in: onlyIds } }
        : {
            extractionExport: { isNot: null },
          }),
    },
    select: {
      id: true,
      customerNo: true,
      expertId: true,
      extractionExport: {
        select: {
          status: true,
          exportedAt: true,
          contentSha256: true,
        },
      },
    },
    orderBy: [{ customerNo: "asc" }, { id: "asc" }],
    ...(limit ? { take: limit } : {}),
  });

  console.log(
    `[backfill-extraction-export] candidates=${rows.length} dryRun=${dryRun} fileStorage=${env.FILE_STORAGE_MODE}`,
  );

  if (rows.length === 0) {
    console.log(
      "[backfill-extraction-export] nothing to do (no matching applications).",
    );
    return;
  }

  let uploaded = 0;
  let unchanged = 0;
  let skipped = 0;
  let failed = 0;
  let busy = 0;

  for (const row of rows) {
    const label = `${row.customerNo ?? "-"} ${row.id}`;
    const previousStatus = row.extractionExport?.status ?? "NONE";

    if (dryRun) {
      console.log(
        `  DRY ${label} previousExport=${previousStatus} exportedAt=${row.extractionExport?.exportedAt?.toISOString() ?? "-"}`,
      );
      skipped += 1;
      continue;
    }

    console.log(`  RUN ${label} previousExport=${previousStatus}`);

    let result = await exportConfirmedExtractionWorkbook({
      applicationId: row.id,
      trigger: "MATERIAL_REVIEW",
    });

    if (result.kind === "busy") {
      console.warn(`  BUSY ${label} — retrying once after 2s`);
      await sleep(2000);
      result = await exportConfirmedExtractionWorkbook({
        applicationId: row.id,
        trigger: "MATERIAL_REVIEW",
      });
    }

    switch (result.kind) {
      case "uploaded":
        uploaded += 1;
        console.log(`  OK  ${label} uploaded`);
        break;
      case "unchanged":
        unchanged += 1;
        console.log(`  OK  ${label} unchanged (hash match)`);
        break;
      case "skipped_storage_mode":
        skipped += 1;
        console.warn(`  SKIP ${label} storage mode`);
        break;
      case "busy":
        busy += 1;
        console.warn(`  FAIL ${label} still busy`);
        break;
      case "dirty_cap":
        failed += 1;
        console.warn(`  FAIL ${label} dirty rerun cap`);
        break;
      case "failed":
        failed += 1;
        console.warn(`  FAIL ${label} export failed`);
        break;
      default:
        failed += 1;
        console.warn(`  FAIL ${label} unexpected result ${JSON.stringify(result)}`);
        break;
    }

    await sleep(150);
  }

  console.log(
    `[backfill-extraction-export] done uploaded=${uploaded} unchanged=${unchanged} skipped=${skipped} busy=${busy} failed=${failed}`,
  );
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
      // ignore disconnect errors when prisma never initialized
    }
  });
