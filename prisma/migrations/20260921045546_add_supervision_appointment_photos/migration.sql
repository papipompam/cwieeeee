-- CreateTable
CREATE TABLE "supervision_appointment_photos" (
    "id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "original_name" TEXT NOT NULL,
    "storage_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supervision_appointment_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supervision_appointment_photos_appointment_id_idx" ON "supervision_appointment_photos"("appointment_id");

-- AddForeignKey
ALTER TABLE "supervision_appointment_photos" ADD CONSTRAINT "supervision_appointment_photos_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "supervision_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
