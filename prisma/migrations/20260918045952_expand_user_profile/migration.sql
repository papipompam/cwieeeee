-- AlterTable
ALTER TABLE "users" ADD COLUMN     "class_group" INTEGER,
ADD COLUMN     "cohort_year" INTEGER,
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "last_name" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "prefix" TEXT;

-- CreateIndex
CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");

-- CreateIndex
CREATE INDEX "users_role_cohort_year_class_group_idx" ON "users"("role", "cohort_year", "class_group");
