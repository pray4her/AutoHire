import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Shanghai today 2026-07-10 → last 3 calendar days: 2026-07-08 .. 2026-07-10
const start = new Date("2026-07-07T16:00:00.000Z");
const endExclusive = new Date("2026-07-10T16:00:00.000Z");

const rows = await prisma.application.findMany({
  where: {
    customerNo: { not: null },
    resumeUploadedAt: { gte: start, lt: endExclusive },
  },
  include: { invitation: { select: { id: true, email: true } } },
  orderBy: { resumeUploadedAt: "desc" },
});

console.log(
  JSON.stringify(
    {
      window: {
        start: start.toISOString(),
        endExclusive: endExclusive.toISOString(),
        note: "Shanghai 2026-07-08..2026-07-10",
      },
      count: rows.length,
      experts: rows.map((r) => ({
        applicationId: r.id,
        customerNo: r.customerNo,
        name: r.screeningPassportFullName,
        status: r.applicationStatus,
        resumeUploadedAt: r.resumeUploadedAt?.toISOString() ?? null,
        submittedAt: r.submittedAt?.toISOString() ?? null,
        screeningContactEmail: r.screeningContactEmail,
        screeningWorkEmail: r.screeningWorkEmail,
        invitationEmail: r.invitation.email,
        listDisplay:
          r.screeningContactEmail ??
          r.screeningWorkEmail ??
          r.invitation.email ??
          null,
        detailDisplay: r.screeningContactEmail ?? r.screeningWorkEmail ?? null,
      })),
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
