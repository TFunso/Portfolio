-- CreateTable
CREATE TABLE "WeeklyDigest" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "entryCount" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "suggestions" TEXT NOT NULL,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyDigest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyDigest_weekStart_idx" ON "WeeklyDigest"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyDigest_weekStart_key" ON "WeeklyDigest"("weekStart");
