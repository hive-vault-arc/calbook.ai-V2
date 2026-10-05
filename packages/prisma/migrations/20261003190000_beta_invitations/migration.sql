CREATE TABLE "BetaInvitation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "cohort" TEXT NOT NULL DEFAULT 'private-beta',
  "invitedById" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "accessDays" INTEGER NOT NULL DEFAULT 90 CHECK ("accessDays" BETWEEN 1 AND 365),
  "sentAt" TIMESTAMP(3),
  "redeemedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "BetaInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BetaInvitation_email_key" ON "BetaInvitation"("email");
CREATE UNIQUE INDEX "BetaInvitation_tokenHash_key" ON "BetaInvitation"("tokenHash");

CREATE TABLE "BetaAccessGrant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "invitationId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "BetaAccessGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BetaAccessGrant_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "BetaInvitation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BetaAccessGrant_userId_key" ON "BetaAccessGrant"("userId");
CREATE UNIQUE INDEX "BetaAccessGrant_invitationId_key" ON "BetaAccessGrant"("invitationId");
CREATE INDEX "BetaAccessGrant_expiresAt_idx" ON "BetaAccessGrant"("expiresAt");
