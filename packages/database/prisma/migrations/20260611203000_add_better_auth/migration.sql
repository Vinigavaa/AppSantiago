ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "displayUsername" TEXT;
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "Session" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "token" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" UUID NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Account" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "refreshTokenExpiresAt" TIMESTAMP(3),
  "scope" TEXT,
  "password" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Verification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3),
  CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_token_idx" ON "Session"("token");
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE INDEX IF NOT EXISTS "Account_accountId_idx" ON "Account"("accountId");
CREATE INDEX IF NOT EXISTS "Verification_identifier_idx" ON "Verification"("identifier");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Session_userId_fkey'
  ) THEN
    ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Account_userId_fkey'
  ) THEN
    ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
