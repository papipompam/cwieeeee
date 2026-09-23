CREATE TABLE "sending_letter_versions" (
    "id" SERIAL NOT NULL,
    "primary_cooperative_request_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "letter_number" TEXT NOT NULL,
    "issue_date" DATE NOT NULL,
    "reference_letter_number" TEXT NOT NULL,
    "reference_issue_date" DATE NOT NULL,
    "template_version" TEXT NOT NULL DEFAULT 'v1',
    "signer_name" TEXT NOT NULL,
    "signer_title" TEXT NOT NULL,
    "issued_by_user_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "superseded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sending_letter_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sending_letter_participants" (
    "id" SERIAL NOT NULL,
    "sending_letter_version_id" INTEGER NOT NULL,
    "cooperative_request_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sending_letter_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sending_letter_version" ON "sending_letter_versions"("primary_cooperative_request_id", "version");
CREATE INDEX "sending_letter_versions_primary_cooperative_request_id_is_active_idx" ON "sending_letter_versions"("primary_cooperative_request_id", "is_active");
CREATE INDEX "sending_letter_versions_issued_by_user_id_idx" ON "sending_letter_versions"("issued_by_user_id");
CREATE UNIQUE INDEX "sending_letter_participant" ON "sending_letter_participants"("sending_letter_version_id", "cooperative_request_id");
CREATE INDEX "sending_letter_participants_cooperative_request_id_idx" ON "sending_letter_participants"("cooperative_request_id");

ALTER TABLE "sending_letter_versions" ADD CONSTRAINT "sending_letter_versions_primary_cooperative_request_id_fkey" FOREIGN KEY ("primary_cooperative_request_id") REFERENCES "cooperative_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sending_letter_versions" ADD CONSTRAINT "sending_letter_versions_issued_by_user_id_fkey" FOREIGN KEY ("issued_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sending_letter_participants" ADD CONSTRAINT "sending_letter_participants_sending_letter_version_id_fkey" FOREIGN KEY ("sending_letter_version_id") REFERENCES "sending_letter_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sending_letter_participants" ADD CONSTRAINT "sending_letter_participants_cooperative_request_id_fkey" FOREIGN KEY ("cooperative_request_id") REFERENCES "cooperative_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
