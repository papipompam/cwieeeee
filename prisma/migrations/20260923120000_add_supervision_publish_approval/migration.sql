ALTER TYPE "SupervisionRoundStatus" RENAME TO "SupervisionRoundStatus_old";
CREATE TYPE "SupervisionRoundStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'COMPLETED');
ALTER TABLE "supervision_rounds"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "SupervisionRoundStatus" USING "status"::text::"SupervisionRoundStatus",
  ALTER COLUMN "status" SET DEFAULT 'DRAFT';
DROP TYPE "SupervisionRoundStatus_old";

ALTER TYPE "SupervisionAppointmentStatus" RENAME TO "SupervisionAppointmentStatus_old";
CREATE TYPE "SupervisionAppointmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "supervision_appointments"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "SupervisionAppointmentStatus" USING "status"::text::"SupervisionAppointmentStatus",
  ALTER COLUMN "status" SET DEFAULT 'DRAFT';
DROP TYPE "SupervisionAppointmentStatus_old";
