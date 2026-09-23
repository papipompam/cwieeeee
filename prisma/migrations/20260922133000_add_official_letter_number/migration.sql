CREATE TABLE "official_letter_numbers" (
  "id" SERIAL NOT NULL,
  "year" INTEGER NOT NULL,
  "letter_number" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "official_letter_numbers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "official_letter_numbers_letter_number_key" ON "official_letter_numbers"("letter_number");
CREATE INDEX "official_letter_numbers_year_idx" ON "official_letter_numbers"("year");
