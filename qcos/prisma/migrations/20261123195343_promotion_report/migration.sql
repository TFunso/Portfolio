-- CreateTable
CREATE TABLE "PromotionReport" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeLabel" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "evidenceCount" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromotionReport_scope_key" ON "PromotionReport"("scope");
