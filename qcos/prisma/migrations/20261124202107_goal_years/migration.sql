-- CreateTable
CREATE TABLE "GoalYear" (
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "objectives" TEXT NOT NULL,
    "metrics" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalYear_pkey" PRIMARY KEY ("year")
);
