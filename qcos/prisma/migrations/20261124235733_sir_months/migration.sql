-- CreateTable
CREATE TABLE "SirMonth" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "completed" INTEGER NOT NULL,
    "hours" DOUBLE PRECISION,
    "findings" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SirMonth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SirMonth_year_month_key" ON "SirMonth"("year", "month");
