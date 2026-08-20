-- AlterTable
ALTER TABLE "public"."EventType" ADD COLUMN     "tierSchedules" JSONB;

-- CreateTable
CREATE TABLE "public"."BookingWaitlist" (
    "id" SERIAL NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "slotTime" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phoneNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "BookingWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingWaitlist_eventTypeId_slotTime_idx" ON "public"."BookingWaitlist"("eventTypeId", "slotTime");

-- CreateIndex
CREATE INDEX "BookingWaitlist_email_idx" ON "public"."BookingWaitlist"("email");

-- AddForeignKey
ALTER TABLE "public"."BookingWaitlist" ADD CONSTRAINT "BookingWaitlist_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "public"."EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
