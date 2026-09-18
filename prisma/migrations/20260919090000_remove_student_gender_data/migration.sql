-- Gender remains available for teachers. Student records no longer store it.
UPDATE "users"
SET "gender" = NULL
WHERE "role" = 'STUDENT';

ALTER TABLE "users"
ADD CONSTRAINT "users_student_gender_empty"
CHECK ("role" <> 'STUDENT' OR "gender" IS NULL);
