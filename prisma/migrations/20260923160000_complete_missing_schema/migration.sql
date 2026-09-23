-- These tables exist in some development databases but were never included in
-- the committed migration history. Keep existing rows when upgrading them.
CREATE TABLE IF NOT EXISTS "evaluation_answers" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "student_evaluation_id" INTEGER,
    "company_evaluation_id" INTEGER,
    "score" INTEGER,
    "text_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "evaluation_answers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "request_letter_participants" (
    "id" SERIAL NOT NULL,
    "request_letter_version_id" INTEGER NOT NULL,
    "cooperative_request_id" INTEGER NOT NULL,
    "student_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "request_letter_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "document_settings" (
    "id" INTEGER NOT NULL,
    "signer_name" TEXT,
    "signer_title" TEXT,
    "signature_path" TEXT,
    "request_letter_sample_path" TEXT,
    "request_letter_sample_name" TEXT,
    "sending_letter_sample_path" TEXT,
    "sending_letter_sample_name" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "document_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "company_reviews" (
    "id" SERIAL NOT NULL,
    "student_user_id" INTEGER NOT NULL,
    "cooperative_request_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewer_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "company_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "evaluation_answers_question_id_student_evaluation_id_key" ON "evaluation_answers"("question_id", "student_evaluation_id");
CREATE UNIQUE INDEX IF NOT EXISTS "evaluation_answers_question_id_company_evaluation_id_key" ON "evaluation_answers"("question_id", "company_evaluation_id");
CREATE INDEX IF NOT EXISTS "request_letter_participants_cooperative_request_id_idx" ON "request_letter_participants"("cooperative_request_id");
CREATE INDEX IF NOT EXISTS "request_letter_participants_request_letter_version_id_idx" ON "request_letter_participants"("request_letter_version_id");
CREATE UNIQUE INDEX IF NOT EXISTS "request_letter_participants_request_letter_version_id_coope_key" ON "request_letter_participants"("request_letter_version_id", "cooperative_request_id");
CREATE UNIQUE INDEX IF NOT EXISTS "company_reviews_cooperative_request_id_key" ON "company_reviews"("cooperative_request_id");
CREATE UNIQUE INDEX IF NOT EXISTS "company_reviews_student_user_id_cooperative_request_id_key" ON "company_reviews"("student_user_id", "cooperative_request_id");

DO $migration$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evaluation_answers_question_id_fkey') THEN
        ALTER TABLE "evaluation_answers" ADD CONSTRAINT "evaluation_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "evaluation_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evaluation_answers_student_evaluation_id_fkey') THEN
        ALTER TABLE "evaluation_answers" ADD CONSTRAINT "evaluation_answers_student_evaluation_id_fkey" FOREIGN KEY ("student_evaluation_id") REFERENCES "student_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evaluation_answers_company_evaluation_id_fkey') THEN
        ALTER TABLE "evaluation_answers" ADD CONSTRAINT "evaluation_answers_company_evaluation_id_fkey" FOREIGN KEY ("company_evaluation_id") REFERENCES "company_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'request_letter_participants_request_letter_version_id_fkey') THEN
        ALTER TABLE "request_letter_participants" ADD CONSTRAINT "request_letter_participants_request_letter_version_id_fkey" FOREIGN KEY ("request_letter_version_id") REFERENCES "request_letter_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'request_letter_participants_cooperative_request_id_fkey') THEN
        ALTER TABLE "request_letter_participants" ADD CONSTRAINT "request_letter_participants_cooperative_request_id_fkey" FOREIGN KEY ("cooperative_request_id") REFERENCES "cooperative_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'company_reviews_student_user_id_fkey') THEN
        ALTER TABLE "company_reviews" ADD CONSTRAINT "company_reviews_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'company_reviews_cooperative_request_id_fkey') THEN
        ALTER TABLE "company_reviews" ADD CONSTRAINT "company_reviews_cooperative_request_id_fkey" FOREIGN KEY ("cooperative_request_id") REFERENCES "cooperative_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $migration$;

-- Match the schema's referential actions for the two grouped-document links.
ALTER TABLE "request_documents" DROP CONSTRAINT "request_documents_request_letter_version_id_fkey";
ALTER TABLE "request_documents" DROP CONSTRAINT "request_documents_uploaded_by_user_id_fkey";
ALTER TABLE "request_documents" ADD CONSTRAINT "request_documents_request_letter_version_id_fkey" FOREIGN KEY ("request_letter_version_id") REFERENCES "request_letter_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "request_documents" ADD CONSTRAINT "request_documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
DROP INDEX IF EXISTS "request_documents_request_letter_version_id_idx";

ALTER INDEX IF EXISTS "sending_letter_participant" RENAME TO "sending_letter_participants_sending_letter_version_id_coope_key";
ALTER INDEX IF EXISTS "sending_letter_version" RENAME TO "sending_letter_versions_primary_cooperative_request_id_vers_key";
ALTER INDEX IF EXISTS "sending_letter_versions_primary_cooperative_request_id_is_activ" RENAME TO "sending_letter_versions_primary_cooperative_request_id_is_a_idx";
