-- CreateEnum
CREATE TYPE "CooperativeCycleStatus" AS ENUM ('OPEN_FOR_APPLICATION', 'APPLICATION_CLOSED', 'IN_PROGRESS', 'CLOSED');

-- CreateTable
CREATE TABLE "cooperative_cycles" (
    "id" SERIAL NOT NULL,
    "term" INTEGER NOT NULL,
    "academic_year" INTEGER NOT NULL,
    "cohort_year" INTEGER NOT NULL,
    "application_start_date" DATE NOT NULL,
    "application_end_date" DATE NOT NULL,
    "internship_start_date" DATE NOT NULL,
    "internship_end_date" DATE NOT NULL,
    "status" "CooperativeCycleStatus" NOT NULL DEFAULT 'OPEN_FOR_APPLICATION',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cooperative_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cooperative_cycles_term_academic_year_key" ON "cooperative_cycles"("term", "academic_year");
