-- Repair keys created before Unicode NFKC normalization was part of the backfill.
-- Keep every legacy row: the lowest id receives the canonical key; other rows keep
-- a stable legacy suffix instead of being merged or reassigned.
WITH normalized AS (
  SELECT
    "id",
    regexp_replace(trim(lower(normalize("name", NFKC))), '\s+', ' ', 'g') || '|' ||
    regexp_replace(trim(lower(normalize("address_no", NFKC))), '\s+', ' ', 'g') || '|' ||
    regexp_replace(trim(lower(normalize(COALESCE("moo", ''), NFKC))), '\s+', ' ', 'g') || '|' ||
    regexp_replace(trim(lower(normalize(COALESCE("soi", ''), NFKC))), '\s+', ' ', 'g') || '|' ||
    regexp_replace(trim(lower(normalize(COALESCE("street", ''), NFKC))), '\s+', ' ', 'g') || '|' ||
    regexp_replace(trim(lower(normalize("subdistrict", NFKC))), '\s+', ' ', 'g') || '|' ||
    regexp_replace(trim(lower(normalize("district", NFKC))), '\s+', ' ', 'g') || '|' ||
    regexp_replace(trim(lower(normalize("province", NFKC))), '\s+', ' ', 'g') || '|' ||
    regexp_replace(trim(lower(normalize("postal_code", NFKC))), '\s+', ' ', 'g') AS base_key
  FROM "companies"
), ranked AS (
  SELECT
    "id",
    base_key,
    ROW_NUMBER() OVER (PARTITION BY base_key ORDER BY "id") AS row_number
  FROM normalized
)
UPDATE "companies" AS company
SET "company_identity_key" = CASE
  WHEN ranked.row_number = 1 THEN ranked.base_key
  ELSE ranked.base_key || '#legacy-' || company."id"
END
FROM ranked
WHERE company."id" = ranked."id";
