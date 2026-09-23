-- CreateEnum
CREATE TYPE "RequestLetterSource" AS ENUM ('GENERATED', 'UPLOADED');

-- CreateTable
CREATE TABLE "request_letter_versions" (
    "id" SERIAL NOT NULL,
    "cooperative_request_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "source" "RequestLetterSource" NOT NULL DEFAULT 'GENERATED',
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "letter_number" TEXT,
    "issue_date" DATE,
    "template_version" TEXT,
    "signer_name" TEXT,
    "signer_title" TEXT,
    "issued_by_user_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "superseded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_letter_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "request_letter_versions_cooperative_request_id_is_active_idx" ON "request_letter_versions"("cooperative_request_id", "is_active");

-- CreateIndex
CREATE INDEX "request_letter_versions_issued_by_user_id_idx" ON "request_letter_versions"("issued_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "request_letter_versions_cooperative_request_id_version_key" ON "request_letter_versions"("cooperative_request_id", "version");

-- AddForeignKey
ALTER TABLE "request_letter_versions" ADD CONSTRAINT "request_letter_versions_cooperative_request_id_fkey" FOREIGN KEY ("cooperative_request_id") REFERENCES "cooperative_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_letter_versions" ADD CONSTRAINT "request_letter_versions_issued_by_user_id_fkey" FOREIGN KEY ("issued_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
