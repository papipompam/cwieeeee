-- AlterTable
ALTER TABLE "company_applications" ADD COLUMN     "application_position" TEXT,
ADD COLUMN     "internship_latitude" DOUBLE PRECISION,
ADD COLUMN     "internship_location_name" TEXT,
ADD COLUMN     "internship_longitude" DOUBLE PRECISION,
ADD COLUMN     "letter_address" TEXT,
ADD COLUMN     "recipient_name" TEXT;
