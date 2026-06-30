import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const appId = "cmqulr7wi000lk8a8z327w6hk";

const app = await prisma.application.findUnique({
  where: { id: appId },
  select: {
    id: true,
    applicationStatus: true,
    eligibilityResult: true,
    screeningContactEmail: true,
    screeningWorkEmail: true,
    invitationId: true,
  },
});
console.log("APPLICATION:", JSON.stringify(app, null, 2));

const invitation = app?.invitationId
  ? await prisma.expertInvitation.findUnique({
      where: { id: app.invitationId },
      select: { email: true },
    })
  : null;
console.log("INVITATION:", JSON.stringify(invitation, null, 2));

const runs = await prisma.materialReviewRun.findMany({
  where: { applicationId: appId },
  orderBy: { runNo: "asc" },
});
console.log("REVIEW_RUNS:", JSON.stringify(runs, null, 2));

const categories = await prisma.materialCategoryReview.findMany({
  where: { applicationId: appId },
  select: {
    category: true,
    status: true,
    isLatest: true,
    reviewRunId: true,
  },
});
console.log("CATEGORY_REVIEWS:", JSON.stringify(categories, null, 2));

try {
  const email = await prisma.initialMaterialReviewReportEmail.findUnique({
    where: { applicationId: appId },
  });
  console.log("EMAIL_RECORD:", JSON.stringify(email, null, 2));
} catch (e) {
  console.log(
    "EMAIL_RECORD_ERROR:",
    e instanceof Error ? e.message : String(e),
  );
}

const events = await prisma.applicationEventLog.findMany({
  where: {
    applicationId: appId,
    eventType: { contains: "initial_material" },
  },
  orderBy: { createdAt: "desc" },
  take: 10,
});
console.log("EMAIL_EVENTS:", JSON.stringify(events, null, 2));

const migrations = await prisma.$queryRaw<
  Array<{ migration_name: string; finished_at: Date }>
>`SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10`;
console.log("MIGRATIONS:", JSON.stringify(migrations, null, 2));

const tableExists = await prisma.$queryRaw<
  Array<{ exists: boolean }>
>`SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'InitialMaterialReviewReportEmail'
) AS exists`;
console.log("EMAIL_TABLE_EXISTS:", JSON.stringify(tableExists, null, 2));

const supplementRequests = await prisma.supplementRequest.findMany({
  where: { applicationId: appId, isLatest: true },
  select: { category: true, status: true, title: true },
});
console.log("SUPPLEMENT_REQUESTS:", JSON.stringify(supplementRequests, null, 2));

await prisma.$disconnect();
await pool.end();
