-- Evaluation records are final on submission; draft state is no longer retained.
ALTER TABLE "student_evaluations" DROP COLUMN "status";
ALTER TABLE "company_evaluations" DROP COLUMN "status";
UPDATE "student_evaluations" SET "submitted_at" = COALESCE("submitted_at", "updated_at", "created_at") WHERE "submitted_at" IS NULL;
UPDATE "company_evaluations" SET "submitted_at" = COALESCE("submitted_at", "updated_at", "created_at") WHERE "submitted_at" IS NULL;
ALTER TABLE "student_evaluations" ALTER COLUMN "submitted_at" SET NOT NULL;
ALTER TABLE "company_evaluations" ALTER COLUMN "submitted_at" SET NOT NULL;
ALTER TABLE "student_evaluations" ALTER COLUMN "submitted_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "company_evaluations" ALTER COLUMN "submitted_at" SET DEFAULT CURRENT_TIMESTAMP;
DROP TYPE "StudentEvaluationStatus";
