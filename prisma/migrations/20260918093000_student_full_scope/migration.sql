-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('WAITING_UPLOAD', 'UPLOADED', 'UNDER_REVIEW', 'APPROVED', 'RETURNED_FOR_REVISION', 'SUPERSEDED');

-- AlterEnum
BEGIN;
CREATE TYPE "CompanyApplicationStatus_new" AS ENUM ('SUBMITTED', 'AWAITING_RESPONSE', 'INTERVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'CONFIRMED');
ALTER TABLE "public"."company_applications" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "company_applications" ALTER COLUMN "status" TYPE "CompanyApplicationStatus_new" USING ("status"::text::"CompanyApplicationStatus_new");
ALTER TYPE "CompanyApplicationStatus" RENAME TO "CompanyApplicationStatus_old";
ALTER TYPE "CompanyApplicationStatus_new" RENAME TO "CompanyApplicationStatus";
DROP TYPE "public"."CompanyApplicationStatus_old";
ALTER TABLE "company_applications" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "CooperativeRequestStatus_new" AS ENUM ('DRAFT', 'SUBMITTED', 'STAFF_PROCESSING', 'LETTER_READY', 'DOCUMENT_UNDER_REVIEW', 'RETURNED_FOR_REVISION', 'PLACEMENT_CONFIRMED', 'REJECTED', 'CANCELLED');
ALTER TABLE "public"."cooperative_requests" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "cooperative_requests" ALTER COLUMN "status" TYPE "CooperativeRequestStatus_new" USING ("status"::text::"CooperativeRequestStatus_new");
ALTER TYPE "CooperativeRequestStatus" RENAME TO "CooperativeRequestStatus_old";
ALTER TYPE "CooperativeRequestStatus_new" RENAME TO "CooperativeRequestStatus";
DROP TYPE "public"."CooperativeRequestStatus_old";
ALTER TABLE "cooperative_requests" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';
COMMIT;

-- AlterTable
ALTER TABLE "company_applications" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';

-- AlterTable
ALTER TABLE "cooperative_requests" ADD COLUMN     "address" TEXT,
ADD COLUMN     "applied_at" DATE,
ADD COLUMN     "company_name" TEXT NOT NULL,
ADD COLUMN     "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "internship_location_name" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "letter_address" TEXT,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "rejected_reason" TEXT,
ADD COLUMN     "returned_reason" TEXT;

-- CreateTable
CREATE TABLE "request_documents" (
    "id" SERIAL NOT NULL,
    "cooperative_request_id" INTEGER NOT NULL,
    "document_type" TEXT NOT NULL DEFAULT 'ACCEPTANCE_LETTER',
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "reviewer_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_visits" (
    "id" SERIAL NOT NULL,
    "cooperative_cycle_id" INTEGER NOT NULL,
    "student_user_id" INTEGER NOT NULL,
    "visit_no" INTEGER NOT NULL DEFAULT 1,
    "visit_date" DATE NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'MORNING',
    "company_name" TEXT NOT NULL,
    "company_address" TEXT,
    "supervisor_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supervision_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "request_documents_cooperative_request_id_idx" ON "request_documents"("cooperative_request_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "supervision_visits_student_user_id_cooperative_cycle_id_idx" ON "supervision_visits"("student_user_id", "cooperative_cycle_id");

-- AddForeignKey
ALTER TABLE "request_documents" ADD CONSTRAINT "request_documents_cooperative_request_id_fkey" FOREIGN KEY ("cooperative_request_id") REFERENCES "cooperative_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_visits" ADD CONSTRAINT "supervision_visits_cooperative_cycle_id_fkey" FOREIGN KEY ("cooperative_cycle_id") REFERENCES "cooperative_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_visits" ADD CONSTRAINT "supervision_visits_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
