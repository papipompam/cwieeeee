-- CreateEnum
CREATE TYPE "SupervisionRoundStatus" AS ENUM ('PLANNING', 'PUBLISHED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SupervisionAppointmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "supervision_rounds" (
    "id" SERIAL NOT NULL,
    "cooperative_cycle_id" INTEGER NOT NULL,
    "round_no" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT,
    "status" "SupervisionRoundStatus" NOT NULL DEFAULT 'PLANNING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supervision_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_groups" (
    "id" SERIAL NOT NULL,
    "supervision_round_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supervision_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_group_companies" (
    "id" SERIAL NOT NULL,
    "supervision_round_id" INTEGER NOT NULL,
    "supervision_group_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supervision_group_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_group_teachers" (
    "id" SERIAL NOT NULL,
    "supervision_round_id" INTEGER NOT NULL,
    "supervision_group_id" INTEGER NOT NULL,
    "teacher_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supervision_group_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_appointments" (
    "id" SERIAL NOT NULL,
    "supervision_round_id" INTEGER NOT NULL,
    "supervision_group_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_address" TEXT,
    "province" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "scheduled_date" DATE NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'MORNING',
    "time_note" TEXT,
    "status" "SupervisionAppointmentStatus" NOT NULL DEFAULT 'DRAFT',
    "change_reason" TEXT,
    "cancel_reason" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supervision_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_appointment_students" (
    "id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "student_user_id" INTEGER NOT NULL,
    "cooperative_request_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supervision_appointment_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_appointment_teachers" (
    "id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "teacher_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supervision_appointment_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_travel_plans" (
    "id" SERIAL NOT NULL,
    "supervision_round_id" INTEGER NOT NULL,
    "supervision_group_id" INTEGER NOT NULL,
    "travel_date" DATE NOT NULL,
    "start_location" TEXT NOT NULL DEFAULT 'มหาวิทยาลัย',
    "fuel_rate" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supervision_travel_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_travel_stops" (
    "id" SERIAL NOT NULL,
    "travel_plan_id" INTEGER NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "distance_km_from_previous" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supervision_travel_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_travel_travellers" (
    "id" SERIAL NOT NULL,
    "travel_plan_id" INTEGER NOT NULL,
    "teacher_user_id" INTEGER NOT NULL,
    "per_diem_rate" DOUBLE PRECISION NOT NULL DEFAULT 300.0,
    "per_diem_days" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "lodging_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "nights" INTEGER NOT NULL DEFAULT 0,
    "persons_per_room" INTEGER NOT NULL DEFAULT 2,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supervision_travel_travellers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supervision_rounds_cooperative_cycle_id_round_no_key" ON "supervision_rounds"("cooperative_cycle_id", "round_no");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_groups_supervision_round_id_name_key" ON "supervision_groups"("supervision_round_id", "name");

-- CreateIndex
CREATE INDEX "supervision_group_companies_supervision_group_id_idx" ON "supervision_group_companies"("supervision_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_group_companies_supervision_round_id_company_id_key" ON "supervision_group_companies"("supervision_round_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_group_teachers_supervision_group_id_teacher_use_key" ON "supervision_group_teachers"("supervision_group_id", "teacher_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_group_teachers_supervision_round_id_teacher_use_key" ON "supervision_group_teachers"("supervision_round_id", "teacher_user_id");

-- CreateIndex
CREATE INDEX "supervision_appointments_supervision_group_id_idx" ON "supervision_appointments"("supervision_group_id");

-- CreateIndex
CREATE INDEX "supervision_appointments_scheduled_date_idx" ON "supervision_appointments"("scheduled_date");

-- CreateIndex
CREATE INDEX "supervision_appointments_status_idx" ON "supervision_appointments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_appointments_supervision_round_id_company_id_key" ON "supervision_appointments"("supervision_round_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_appointment_students_appointment_id_student_use_key" ON "supervision_appointment_students"("appointment_id", "student_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_appointment_teachers_appointment_id_teacher_use_key" ON "supervision_appointment_teachers"("appointment_id", "teacher_user_id");

-- CreateIndex
CREATE INDEX "supervision_travel_plans_supervision_group_id_idx" ON "supervision_travel_plans"("supervision_group_id");

-- CreateIndex
CREATE INDEX "supervision_travel_plans_supervision_round_id_idx" ON "supervision_travel_plans"("supervision_round_id");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_travel_stops_travel_plan_id_sequence_key" ON "supervision_travel_stops"("travel_plan_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_travel_stops_travel_plan_id_appointment_id_key" ON "supervision_travel_stops"("travel_plan_id", "appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_travel_travellers_travel_plan_id_teacher_user_i_key" ON "supervision_travel_travellers"("travel_plan_id", "teacher_user_id");

-- AddForeignKey
ALTER TABLE "supervision_rounds" ADD CONSTRAINT "supervision_rounds_cooperative_cycle_id_fkey" FOREIGN KEY ("cooperative_cycle_id") REFERENCES "cooperative_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_groups" ADD CONSTRAINT "supervision_groups_supervision_round_id_fkey" FOREIGN KEY ("supervision_round_id") REFERENCES "supervision_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_group_companies" ADD CONSTRAINT "supervision_group_companies_supervision_round_id_fkey" FOREIGN KEY ("supervision_round_id") REFERENCES "supervision_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_group_companies" ADD CONSTRAINT "supervision_group_companies_supervision_group_id_fkey" FOREIGN KEY ("supervision_group_id") REFERENCES "supervision_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_group_companies" ADD CONSTRAINT "supervision_group_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_group_teachers" ADD CONSTRAINT "supervision_group_teachers_supervision_round_id_fkey" FOREIGN KEY ("supervision_round_id") REFERENCES "supervision_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_group_teachers" ADD CONSTRAINT "supervision_group_teachers_supervision_group_id_fkey" FOREIGN KEY ("supervision_group_id") REFERENCES "supervision_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_group_teachers" ADD CONSTRAINT "supervision_group_teachers_teacher_user_id_fkey" FOREIGN KEY ("teacher_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_appointments" ADD CONSTRAINT "supervision_appointments_supervision_round_id_fkey" FOREIGN KEY ("supervision_round_id") REFERENCES "supervision_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_appointments" ADD CONSTRAINT "supervision_appointments_supervision_group_id_fkey" FOREIGN KEY ("supervision_group_id") REFERENCES "supervision_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_appointments" ADD CONSTRAINT "supervision_appointments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_appointment_students" ADD CONSTRAINT "supervision_appointment_students_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "supervision_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_appointment_students" ADD CONSTRAINT "supervision_appointment_students_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_appointment_students" ADD CONSTRAINT "supervision_appointment_students_cooperative_request_id_fkey" FOREIGN KEY ("cooperative_request_id") REFERENCES "cooperative_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_appointment_teachers" ADD CONSTRAINT "supervision_appointment_teachers_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "supervision_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_appointment_teachers" ADD CONSTRAINT "supervision_appointment_teachers_teacher_user_id_fkey" FOREIGN KEY ("teacher_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_travel_plans" ADD CONSTRAINT "supervision_travel_plans_supervision_round_id_fkey" FOREIGN KEY ("supervision_round_id") REFERENCES "supervision_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_travel_plans" ADD CONSTRAINT "supervision_travel_plans_supervision_group_id_fkey" FOREIGN KEY ("supervision_group_id") REFERENCES "supervision_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_travel_stops" ADD CONSTRAINT "supervision_travel_stops_travel_plan_id_fkey" FOREIGN KEY ("travel_plan_id") REFERENCES "supervision_travel_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_travel_stops" ADD CONSTRAINT "supervision_travel_stops_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "supervision_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_travel_travellers" ADD CONSTRAINT "supervision_travel_travellers_travel_plan_id_fkey" FOREIGN KEY ("travel_plan_id") REFERENCES "supervision_travel_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_travel_travellers" ADD CONSTRAINT "supervision_travel_travellers_teacher_user_id_fkey" FOREIGN KEY ("teacher_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
