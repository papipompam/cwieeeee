-- CreateTable
CREATE TABLE "company_evaluations" (
    "id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "teacher_user_id" INTEGER NOT NULL,
    "work_alignment_score" INTEGER,
    "work_scope_score" INTEGER,
    "learning_opportunity_score" INTEGER,
    "supervisor_readiness_score" INTEGER,
    "student_support_score" INTEGER,
    "environment_score" INTEGER,
    "safety_score" INTEGER,
    "resources_score" INTEGER,
    "welfare_score" INTEGER,
    "travel_score" INTEGER,
    "transport_score" INTEGER,
    "accommodation_score" INTEGER,
    "coordination_score" INTEGER,
    "observations" TEXT,
    "company_needs" TEXT,
    "problems" TEXT,
    "recommendations" TEXT,
    "future_recommendation" TEXT,
    "status" "StudentEvaluationStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_evaluations_teacher_user_id_status_idx" ON "company_evaluations"("teacher_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "company_evaluations_appointment_id_teacher_user_id_key" ON "company_evaluations"("appointment_id", "teacher_user_id");

-- AddForeignKey
ALTER TABLE "company_evaluations" ADD CONSTRAINT "company_evaluations_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "supervision_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_evaluations" ADD CONSTRAINT "company_evaluations_teacher_user_id_fkey" FOREIGN KEY ("teacher_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
