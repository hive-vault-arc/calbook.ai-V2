-- CreateEnum
CREATE TYPE "public"."BookingPackageStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'EXHAUSTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."PaymentOption" ADD VALUE 'DEPOSIT';
ALTER TYPE "public"."PaymentOption" ADD VALUE 'TIP';

-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "bookingPackageId" INTEGER;

-- CreateTable
CREATE TABLE "public"."BookingPackage" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "organizerId" INTEGER NOT NULL,
    "attendeeEmail" TEXT NOT NULL,
    "attendeeName" TEXT,
    "eventTypeId" INTEGER NOT NULL,
    "stripePaymentId" TEXT,
    "totalSessions" INTEGER NOT NULL,
    "usedSessions" INTEGER NOT NULL DEFAULT 0,
    "pricePerSession" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "public"."BookingPackageStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingPackage_uid_key" ON "public"."BookingPackage"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPackage_stripePaymentId_key" ON "public"."BookingPackage"("stripePaymentId");

-- CreateIndex
CREATE INDEX "BookingPackage_organizerId_idx" ON "public"."BookingPackage"("organizerId");

-- CreateIndex
CREATE INDEX "BookingPackage_attendeeEmail_idx" ON "public"."BookingPackage"("attendeeEmail");

-- CreateIndex
CREATE INDEX "BookingPackage_eventTypeId_idx" ON "public"."BookingPackage"("eventTypeId");

-- CreateIndex
CREATE INDEX "BookingPackage_status_expiresAt_idx" ON "public"."BookingPackage"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Booking_bookingPackageId_idx" ON "public"."Booking"("bookingPackageId");

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_bookingPackageId_fkey" FOREIGN KEY ("bookingPackageId") REFERENCES "public"."BookingPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookingPackage" ADD CONSTRAINT "BookingPackage_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookingPackage" ADD CONSTRAINT "BookingPackage_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "public"."EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
