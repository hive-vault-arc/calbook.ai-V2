-- AlterTable
ALTER TABLE "public"."BookingWaitlist" ADD COLUMN "deduplicationKey" TEXT;
ALTER TABLE "public"."BookingWaitlist" ADD COLUMN "redemptionClaimToken" TEXT;
ALTER TABLE "public"."BookingWaitlist" ADD COLUMN "redemptionClaimExpiresAt" TIMESTAMP(3);

-- Existing rows predate deterministic queue-entry keys. Their legacy keys remain unique;
-- newly created entries use the application-generated event/slot/tier/email key.
UPDATE "public"."BookingWaitlist"
SET "deduplicationKey" = 'legacy:' || "id"::TEXT;

ALTER TABLE "public"."BookingWaitlist" ALTER COLUMN "deduplicationKey" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BookingWaitlist_deduplicationKey_key" ON "public"."BookingWaitlist"("deduplicationKey");
CREATE UNIQUE INDEX "BookingWaitlist_redemptionClaimToken_key" ON "public"."BookingWaitlist"("redemptionClaimToken");
CREATE INDEX "BookingWaitlist_redemptionClaimExpiresAt_idx" ON "public"."BookingWaitlist"("redemptionClaimExpiresAt");
