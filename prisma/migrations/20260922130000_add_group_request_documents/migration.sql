-- A response letter belongs to the request-letter batch when it was issued for a group.
ALTER TABLE "request_documents"
  ADD COLUMN "request_letter_version_id" INTEGER,
  ADD COLUMN "uploaded_by_user_id" INTEGER;

ALTER TABLE "request_documents"
  ADD CONSTRAINT "request_documents_request_letter_version_id_fkey"
    FOREIGN KEY ("request_letter_version_id") REFERENCES "request_letter_versions"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "request_documents_uploaded_by_user_id_fkey"
    FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;

CREATE UNIQUE INDEX "request_documents_request_letter_version_id_version_key"
  ON "request_documents"("request_letter_version_id", "version");
CREATE INDEX "request_documents_request_letter_version_id_idx"
  ON "request_documents"("request_letter_version_id");
