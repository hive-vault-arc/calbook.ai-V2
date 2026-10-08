-- Align the existing constraints with Prisma's default ON UPDATE CASCADE relation behavior.
ALTER TABLE "public"."EventSubscription"
  DROP CONSTRAINT "EventSubscription_eventTypeId_fkey",
  ADD CONSTRAINT "EventSubscription_eventTypeId_fkey"
    FOREIGN KEY ("eventTypeId") REFERENCES "public"."EventType"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."EventSubscription"
  DROP CONSTRAINT "EventSubscription_userId_fkey",
  ADD CONSTRAINT "EventSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "public"."users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
