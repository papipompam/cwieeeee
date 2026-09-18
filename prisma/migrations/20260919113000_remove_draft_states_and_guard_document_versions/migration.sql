UPDATE "cooperative_requests" SET "status" = 'SUBMITTED' WHERE "status"::text = 'DRAFT';
UPDATE "supervision_rounds" SET "status" = 'PUBLISHED' WHERE "status"::text = 'PLANNING';
UPDATE "supervision_appointments"
SET "status" = 'PUBLISHED', "published_at" = COALESCE("published_at", "created_at")
WHERE "status"::text = 'DRAFT';

ALTER TYPE "CooperativeRequestStatus" RENAME TO "CooperativeRequestStatus_old";
CREATE TYPE "CooperativeRequestStatus" AS ENUM ('SUBMITTED', 'STAFF_PROCESSING', 'LETTER_READY', 'DOCUMENT_UNDER_REVIEW', 'RETURNED_FOR_REVISION', 'PLACEMENT_CONFIRMED', 'REJECTED', 'CANCELLED');
ALTER TABLE "cooperative_requests"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "CooperativeRequestStatus" USING "status"::text::"CooperativeRequestStatus",
  ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';
DROP TYPE "CooperativeRequestStatus_old";

ALTER TYPE "SupervisionRoundStatus" RENAME TO "SupervisionRoundStatus_old";
CREATE TYPE "SupervisionRoundStatus" AS ENUM ('PUBLISHED', 'COMPLETED');
ALTER TABLE "supervision_rounds"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "SupervisionRoundStatus" USING "status"::text::"SupervisionRoundStatus",
  ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';
DROP TYPE "SupervisionRoundStatus_old";

ALTER TYPE "SupervisionAppointmentStatus" RENAME TO "SupervisionAppointmentStatus_old";
CREATE TYPE "SupervisionAppointmentStatus" AS ENUM ('PUBLISHED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "supervision_appointments"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "SupervisionAppointmentStatus" USING "status"::text::"SupervisionAppointmentStatus",
  ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';
DROP TYPE "SupervisionAppointmentStatus_old";

WITH "numbered_documents" AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "cooperative_request_id"
    ORDER BY "version" ASC, "created_at" ASC, "id" ASC
  ) AS "new_version"
  FROM "request_documents"
)
UPDATE "request_documents" AS "document"
SET "version" = "numbered_documents"."new_version"
FROM "numbered_documents"
WHERE "document"."id" = "numbered_documents"."id";

CREATE UNIQUE INDEX "request_documents_cooperative_request_id_version_key"
ON "request_documents"("cooperative_request_id", "version");
