CREATE TABLE IF NOT EXISTS "official_letter_sequences" (
    "year" INTEGER NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "official_letter_sequences_pkey" PRIMARY KEY ("year")
);
