CREATE TABLE "ApplicationFaqEntry" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationFaqEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApplicationFaqEntry_slug_key" ON "ApplicationFaqEntry"("slug");
CREATE INDEX "ApplicationFaqEntry_isPublished_sortOrder_createdAt_idx" ON "ApplicationFaqEntry"("isPublished", "sortOrder", "createdAt");
