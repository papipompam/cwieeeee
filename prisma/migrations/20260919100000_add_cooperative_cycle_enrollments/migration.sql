CREATE TABLE "cooperative_cycle_enrollments" (
  "id" SERIAL NOT NULL,
  "cooperative_cycle_id" INTEGER NOT NULL,
  "student_user_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cooperative_cycle_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cooperative_cycle_enrollments_cooperative_cycle_id_student_user_id_key"
ON "cooperative_cycle_enrollments"("cooperative_cycle_id", "student_user_id");

CREATE INDEX "cooperative_cycle_enrollments_student_user_id_idx"
ON "cooperative_cycle_enrollments"("student_user_id");

ALTER TABLE "cooperative_cycle_enrollments"
ADD CONSTRAINT "cooperative_cycle_enrollments_cooperative_cycle_id_fkey"
FOREIGN KEY ("cooperative_cycle_id") REFERENCES "cooperative_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cooperative_cycle_enrollments"
ADD CONSTRAINT "cooperative_cycle_enrollments_student_user_id_fkey"
FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "cooperative_cycle_enrollments" ("cooperative_cycle_id", "student_user_id")
SELECT "c"."id", "u"."id"
FROM "cooperative_cycles" AS "c"
JOIN "users" AS "u"
  ON "u"."role" = 'STUDENT'
  AND "u"."cohort_year" = "c"."cohort_year"
ON CONFLICT ("cooperative_cycle_id", "student_user_id") DO NOTHING;
