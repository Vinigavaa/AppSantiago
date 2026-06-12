CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'PROFESSIONAL', 'ADMIN');
CREATE TYPE "ServiceRequestStatus" AS ENUM ('OPEN', 'IN_NEGOTIATION', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED');
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELED');
CREATE TYPE "ServiceContractStatus" AS ENUM ('ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED');
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'PROPOSAL_RECEIVED', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED', 'MESSAGE_RECEIVED', 'SERVICE_UPDATED', 'REVIEW_RECEIVED');

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "phone" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientProfile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "document" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfessionalProfile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "document" TEXT,
  "bio" TEXT,
  "experience" INTEGER,
  "portfolioDescription" TEXT,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "ratingAverage" DECIMAL(3,2) NOT NULL DEFAULT 0,
  "ratingCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Category" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfessionalCategory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "professionalId" UUID NOT NULL,
  "categoryId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfessionalCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "City" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfessionalCity" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "professionalId" UUID NOT NULL,
  "cityId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfessionalCity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceRequest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "clientId" UUID NOT NULL,
  "categoryId" UUID NOT NULL,
  "cityId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "ServiceRequestStatus" NOT NULL DEFAULT 'OPEN',
  "addressStreet" TEXT NOT NULL,
  "addressNumber" TEXT NOT NULL,
  "addressNeighborhood" TEXT NOT NULL,
  "addressComplement" TEXT,
  "addressZipCode" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceRequestPhoto" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "serviceRequestId" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceRequestPhoto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Proposal" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "serviceRequestId" UUID NOT NULL,
  "professionalId" UUID NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "description" TEXT NOT NULL,
  "estimatedDays" INTEGER,
  "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceContract" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "serviceRequestId" UUID NOT NULL,
  "proposalId" UUID NOT NULL,
  "clientId" UUID NOT NULL,
  "professionalId" UUID NOT NULL,
  "status" "ServiceContractStatus" NOT NULL DEFAULT 'ACCEPTED',
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceContract_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Review" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "serviceContractId" UUID NOT NULL,
  "reviewerId" UUID NOT NULL,
  "reviewedId" UUID NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Review_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5),
  CONSTRAINT "Review_distinct_users_check" CHECK ("reviewerId" <> "reviewedId")
);

CREATE TABLE "Chat" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "serviceRequestId" UUID NOT NULL,
  "serviceContractId" UUID,
  "clientId" UUID NOT NULL,
  "professionalId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "chatId" UUID NOT NULL,
  "senderId" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfessionalPortfolioItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "professionalId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfessionalPortfolioItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE UNIQUE INDEX "ClientProfile_userId_key" ON "ClientProfile"("userId");
CREATE UNIQUE INDEX "ClientProfile_document_key" ON "ClientProfile"("document");
CREATE UNIQUE INDEX "ProfessionalProfile_userId_key" ON "ProfessionalProfile"("userId");
CREATE UNIQUE INDEX "ProfessionalProfile_document_key" ON "ProfessionalProfile"("document");
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_slug_idx" ON "Category"("slug");
CREATE UNIQUE INDEX "ProfessionalCategory_professionalId_categoryId_key" ON "ProfessionalCategory"("professionalId", "categoryId");
CREATE INDEX "ProfessionalCategory_professionalId_idx" ON "ProfessionalCategory"("professionalId");
CREATE INDEX "ProfessionalCategory_categoryId_idx" ON "ProfessionalCategory"("categoryId");
CREATE UNIQUE INDEX "City_name_state_key" ON "City"("name", "state");
CREATE UNIQUE INDEX "ProfessionalCity_professionalId_cityId_key" ON "ProfessionalCity"("professionalId", "cityId");
CREATE INDEX "ProfessionalCity_professionalId_idx" ON "ProfessionalCity"("professionalId");
CREATE INDEX "ProfessionalCity_cityId_idx" ON "ProfessionalCity"("cityId");
CREATE INDEX "ServiceRequest_clientId_idx" ON "ServiceRequest"("clientId");
CREATE INDEX "ServiceRequest_categoryId_idx" ON "ServiceRequest"("categoryId");
CREATE INDEX "ServiceRequest_cityId_idx" ON "ServiceRequest"("cityId");
CREATE INDEX "ServiceRequest_status_idx" ON "ServiceRequest"("status");
CREATE INDEX "ServiceRequestPhoto_serviceRequestId_idx" ON "ServiceRequestPhoto"("serviceRequestId");
CREATE UNIQUE INDEX "Proposal_serviceRequestId_professionalId_key" ON "Proposal"("serviceRequestId", "professionalId");
CREATE UNIQUE INDEX "Proposal_one_accepted_per_request_idx" ON "Proposal"("serviceRequestId") WHERE "status" = 'ACCEPTED';
CREATE INDEX "Proposal_serviceRequestId_idx" ON "Proposal"("serviceRequestId");
CREATE INDEX "Proposal_professionalId_idx" ON "Proposal"("professionalId");
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");
CREATE UNIQUE INDEX "ServiceContract_serviceRequestId_key" ON "ServiceContract"("serviceRequestId");
CREATE UNIQUE INDEX "ServiceContract_proposalId_key" ON "ServiceContract"("proposalId");
CREATE INDEX "ServiceContract_clientId_idx" ON "ServiceContract"("clientId");
CREATE INDEX "ServiceContract_professionalId_idx" ON "ServiceContract"("professionalId");
CREATE INDEX "ServiceContract_status_idx" ON "ServiceContract"("status");
CREATE UNIQUE INDEX "Review_serviceContractId_reviewerId_reviewedId_key" ON "Review"("serviceContractId", "reviewerId", "reviewedId");
CREATE INDEX "Review_reviewerId_idx" ON "Review"("reviewerId");
CREATE INDEX "Review_reviewedId_idx" ON "Review"("reviewedId");
CREATE UNIQUE INDEX "Chat_serviceRequestId_professionalId_key" ON "Chat"("serviceRequestId", "professionalId");
CREATE INDEX "Chat_clientId_idx" ON "Chat"("clientId");
CREATE INDEX "Chat_professionalId_idx" ON "Chat"("professionalId");
CREATE INDEX "Chat_serviceRequestId_idx" ON "Chat"("serviceRequestId");
CREATE INDEX "Message_chatId_idx" ON "Message"("chatId");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_type_idx" ON "Notification"("type");
CREATE INDEX "ProfessionalPortfolioItem_professionalId_idx" ON "ProfessionalPortfolioItem"("professionalId");

ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalCategory" ADD CONSTRAINT "ProfessionalCategory_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalCategory" ADD CONSTRAINT "ProfessionalCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProfessionalCity" ADD CONSTRAINT "ProfessionalCity_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalCity" ADD CONSTRAINT "ProfessionalCity_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceRequestPhoto" ADD CONSTRAINT "ServiceRequestPhoto_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceContract" ADD CONSTRAINT "ServiceContract_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceContract" ADD CONSTRAINT "ServiceContract_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceContract" ADD CONSTRAINT "ServiceContract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceContract" ADD CONSTRAINT "ServiceContract_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_serviceContractId_fkey" FOREIGN KEY ("serviceContractId") REFERENCES "ServiceContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewedId_fkey" FOREIGN KEY ("reviewedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_serviceContractId_fkey" FOREIGN KEY ("serviceContractId") REFERENCES "ServiceContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalPortfolioItem" ADD CONSTRAINT "ProfessionalPortfolioItem_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
