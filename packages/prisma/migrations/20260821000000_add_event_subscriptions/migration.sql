-- AlterTable
ALTER TABLE "public"."EventType" ADD COLUMN "requiresSubscription" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "public"."EventType" ADD COLUMN "subscriptionConfig" JSONB;
ALTER TABLE "public"."EventType" ADD COLUMN "stripeSubscriptionPriceId" TEXT;

-- CreateTable
CREATE TABLE "public"."EventSubscription" (
    "id" SERIAL NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "userId" INTEGER,
    "email" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeSubscriptionItemId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventSubscription_stripeSubscriptionId_key" ON "public"."EventSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "EventSubscription_eventTypeId_email_idx" ON "public"."EventSubscription"("eventTypeId", "email");

-- CreateIndex
CREATE INDEX "EventSubscription_eventTypeId_userId_idx" ON "public"."EventSubscription"("eventTypeId", "userId");

-- CreateIndex
CREATE INDEX "EventSubscription_stripeCustomerId_idx" ON "public"."EventSubscription"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "public"."EventSubscription" ADD CONSTRAINT "EventSubscription_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "public"."EventType"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventSubscription" ADD CONSTRAINT "EventSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE;
