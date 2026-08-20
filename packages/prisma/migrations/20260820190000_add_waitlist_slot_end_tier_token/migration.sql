-- AlterTable
ALTER TABLE "public"."BookingWaitlist" ADD COLUMN "slotEndTime" TIMESTAMP(3);
ALTER TABLE "public"."BookingWaitlist" ADD COLUMN "tier" TEXT;
ALTER TABLE "public"."BookingWaitlist" ADD COLUMN "promotionToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BookingWaitlist_promotionToken_key" ON "public"."BookingWaitlist"("promotionToken");

-- CreateIndex
CREATE INDEX "BookingWaitlist_promotionToken_idx" ON "public"."BookingWaitlist"("promotionToken");

