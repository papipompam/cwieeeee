-- CreateIndex
CREATE INDEX "company_evaluations_teacher_user_id_idx" ON "company_evaluations"("teacher_user_id");

-- CreateIndex
CREATE INDEX "student_evaluations_teacher_user_id_idx" ON "student_evaluations"("teacher_user_id");

-- RenameIndex
ALTER INDEX "cooperative_cycle_enrollments_cooperative_cycle_id_student_user" RENAME TO "cooperative_cycle_enrollments_cooperative_cycle_id_student__key";
