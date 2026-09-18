-- AlterTable: Add column as nullable first
ALTER TABLE "companies" ADD COLUMN "company_identity_key" TEXT;

-- Backfill existing rows with canonical normalized identity key
UPDATE "companies" SET "company_identity_key" =
  regexp_replace(trim(lower("name")), '\s+', ' ', 'g') || '|' ||
  regexp_replace(trim(lower("address_no")), '\s+', ' ', 'g') || '|' ||
  regexp_replace(trim(lower(COALESCE("moo", ''))), '\s+', ' ', 'g') || '|' ||
  regexp_replace(trim(lower(COALESCE("soi", ''))), '\s+', ' ', 'g') || '|' ||
  regexp_replace(trim(lower(COALESCE("street", ''))), '\s+', ' ', 'g') || '|' ||
  regexp_replace(trim(lower("subdistrict")), '\s+', ' ', 'g') || '|' ||
  regexp_replace(trim(lower("district")), '\s+', ' ', 'g') || '|' ||
  regexp_replace(trim(lower("province")), '\s+', ' ', 'g') || '|' ||
  regexp_replace(trim(lower("postal_code")), '\s+', ' ', 'g');

-- Handle any duplicate legacy rows safely without data loss or re-assignment
WITH duplicates AS (
  SELECT "id", ROW_NUMBER() OVER(PARTITION BY "company_identity_key" ORDER BY "id") as rn
  FROM "companies"
)
UPDATE "companies" c
SET "company_identity_key" = c."company_identity_key" || '#legacy-' || c."id"
FROM duplicates d
WHERE c."id" = d."id" AND d.rn > 1;

-- AlterColumn: Make NOT NULL after backfill
ALTER TABLE "companies" ALTER COLUMN "company_identity_key" SET NOT NULL;

-- CreateIndex: Add database-level unique constraint
CREATE UNIQUE INDEX "companies_company_identity_key_key" ON "companies"("company_identity_key");
