-- Preserve existing rounds and their assignments; add only missing fixed rounds.
INSERT INTO "supervision_rounds" ("cooperative_cycle_id", "round_no", "name", "status", "created_at", "updated_at")
SELECT cycle."id", round_number."round_no", 'นิเทศครั้งที่ ' || round_number."round_no", 'DRAFT'::"SupervisionRoundStatus", NOW(), NOW()
FROM "cooperative_cycles" AS cycle
CROSS JOIN (VALUES (1), (2)) AS round_number("round_no")
ON CONFLICT ("cooperative_cycle_id", "round_no") DO NOTHING;
