-- CreateEnum
CREATE TYPE "StudentEvaluationStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateTable
CREATE TABLE "student_evaluations" (
    "id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "student_user_id" INTEGER NOT NULL,
    "teacher_user_id" INTEGER NOT NULL,
    "responsibility_score" INTEGER,
    "discipline_score" INTEGER,
    "communication_score" INTEGER,
    "knowledge_score" INTEGER,
    "work_quality_score" INTEGER,
    "problem_solving_score" INTEGER,
    "strengths" TEXT,
    "problems" TEXT,
    "recommendations" TEXT,
    "follow_up" TEXT,
    "status" "StudentEvaluationStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_evaluations_teacher_user_id_status_idx" ON "student_evaluations"("teacher_user_id", "status");

-- CreateIndex
CREATE INDEX "student_evaluations_student_user_id_idx" ON "student_evaluations"("student_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_evaluations_appointment_id_student_user_id_teacher__key" ON "student_evaluations"("appointment_id", "student_user_id", "teacher_user_id");

-- AddForeignKey
ALTER TABLE "student_evaluations" ADD CONSTRAINT "student_evaluations_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "supervision_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_evaluations" ADD CONSTRAINT "student_evaluations_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_evaluations" ADD CONSTRAINT "student_evaluations_teacher_user_id_fkey" FOREIGN KEY ("teacher_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
