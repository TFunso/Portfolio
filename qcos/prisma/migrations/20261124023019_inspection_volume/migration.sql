-- CreateTable
CREATE TABLE "InspectionVolume" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "inspected" INTEGER NOT NULL,
    "accepted" INTEGER NOT NULL,
    "rejected" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'SAP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionVolume_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InspectionVolume_year_month_key" ON "InspectionVolume"("year", "month");
