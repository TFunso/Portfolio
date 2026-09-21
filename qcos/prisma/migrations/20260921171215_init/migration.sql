-- CreateTable
CREATE TABLE "DailyEntry" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classification" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "counts" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "categories" TEXT NOT NULL,
    "departments" TEXT NOT NULL,
    "impactLevel" TEXT NOT NULL,
    "goalKeys" TEXT NOT NULL,
    "professionalSummary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Classification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceRecord" (
    "id" TEXT NOT NULL,
    "entryId" TEXT,
    "whatHappened" TEXT NOT NULL,
    "whyItMattered" TEXT NOT NULL,
    "businessImpact" TEXT NOT NULL,
    "goalSupported" TEXT,
    "category" TEXT NOT NULL,
    "impactLevel" TEXT NOT NULL,
    "suggestedReviewLanguage" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "recordDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalMetricEvent" (
    "id" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "entryId" TEXT,
    "note" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalMetricEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DidThisCountLog" (
    "id" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "counts" BOOLEAN NOT NULL,
    "businessImpact" TEXT NOT NULL,
    "goalAlignment" TEXT NOT NULL,
    "promotionValue" TEXT NOT NULL,
    "recommendedLanguage" TEXT NOT NULL,
    "savedAsEvidence" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DidThisCountLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyReflection" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "answers" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyReflection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyEntry_entryDate_idx" ON "DailyEntry"("entryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Classification_entryId_key" ON "Classification"("entryId");

-- CreateIndex
CREATE INDEX "EvidenceRecord_recordDate_idx" ON "EvidenceRecord"("recordDate");

-- CreateIndex
CREATE INDEX "EvidenceRecord_category_idx" ON "EvidenceRecord"("category");

-- CreateIndex
CREATE INDEX "GoalMetricEvent_metricKey_idx" ON "GoalMetricEvent"("metricKey");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReflection_month_year_key" ON "MonthlyReflection"("month", "year");

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "DailyEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRecord" ADD CONSTRAINT "EvidenceRecord_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "DailyEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalMetricEvent" ADD CONSTRAINT "GoalMetricEvent_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "DailyEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
