-- CreateEnum
CREATE TYPE "CompanyApplicationStatus" AS ENUM ('PENDING', 'REJECTED', 'ACCEPTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CooperativeRequestStatus" AS ENUM ('SUBMITTED', 'LETTER_ISSUED', 'SIGNED_DOCUMENT_SUBMITTED');

-- CreateTable
CREATE TABLE "company_applications" (
    "id" SERIAL NOT NULL,
    "student_user_id" INTEGER NOT NULL,
    "cooperative_cycle_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "status" "CompanyApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "application_method" TEXT NOT NULL DEFAULT 'EMAIL',
    "applied_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "outcome_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cooperative_requests" (
    "id" SERIAL NOT NULL,
    "company_application_id" INTEGER NOT NULL,
    "status" "CooperativeRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "recipient_name" TEXT,
    "recipient_position" TEXT,
    "student_note" TEXT,
    "letter_file_path" TEXT,
    "letter_original_name" TEXT,
    "letter_issued_at" TIMESTAMP(3),
    "signed_document_path" TEXT,
    "signed_document_original_name" TEXT,
    "signed_document_submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cooperative_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_applications_student_user_id_cooperative_cycle_id_idx" ON "company_applications"("student_user_id", "cooperative_cycle_id");

-- CreateIndex
CREATE INDEX "company_applications_status_idx" ON "company_applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cooperative_requests_company_application_id_key" ON "cooperative_requests"("company_application_id");

-- AddForeignKey
ALTER TABLE "company_applications" ADD CONSTRAINT "company_applications_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_applications" ADD CONSTRAINT "company_applications_cooperative_cycle_id_fkey" FOREIGN KEY ("cooperative_cycle_id") REFERENCES "cooperative_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_applications" ADD CONSTRAINT "company_applications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooperative_requests" ADD CONSTRAINT "cooperative_requests_company_application_id_fkey" FOREIGN KEY ("company_application_id") REFERENCES "company_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
