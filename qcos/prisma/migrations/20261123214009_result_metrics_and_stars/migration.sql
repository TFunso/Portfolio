-- AlterTable
ALTER TABLE "EvidenceRecord" ADD COLUMN     "costAvoided" INTEGER,
ADD COLUMN     "defectsCaught" INTEGER,
ADD COLUMN     "delayDaysAvoided" DOUBLE PRECISION,
ADD COLUMN     "hoursSaved" DOUBLE PRECISION,
ADD COLUMN     "starred" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unitsHandled" INTEGER;

-- CreateIndex
CREATE INDEX "EvidenceRecord_starred_idx" ON "EvidenceRecord"("starred");
