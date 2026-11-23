-- CreateTable
CREATE TABLE "GapCheck" (
    "id" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "evidenceCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GapCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GapCheck_createdAt_idx" ON "GapCheck"("createdAt");
