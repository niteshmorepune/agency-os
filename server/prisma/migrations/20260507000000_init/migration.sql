-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ACCOUNT_MANAGER', 'CONTENT_CREATOR', 'SEO_ANALYST', 'CLIENT', 'AUDITOR');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CHURNED');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AuditCheckStatus" AS ENUM ('PENDING', 'PASS', 'WARN', 'FAIL', 'NA');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('LINKEDIN', 'INSTAGRAM', 'FACEBOOK', 'GBP', 'YOUTUBE', 'TWITTER', 'TIKTOK', 'PINTEREST', 'GOOGLE_ADS', 'EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('PENDING', 'PASS', 'WARN', 'FAIL', 'NA');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('SAVED', 'USED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('MONTHLY', 'PLATFORM_SPECIFIC', 'AUDIT_ONLY', 'CUSTOM');

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#1a472a',
    "accentColor" TEXT NOT NULL DEFAULT '#c8522a',
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter',
    "reportFooter" TEXT,
    "reportTagline" TEXT,
    "faviconUrl" TEXT,
    "customDomain" TEXT,
    "ahrefsKey" TEXT,
    "dataforseKey" TEXT,
    "psiApiKey" TEXT,
    "anthropicKey" TEXT,
    "gscClientId" TEXT,
    "gscClientSecret" TEXT,
    "smtpHost" TEXT,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "aiMonthlyBudgetUsd" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'AUDITOR',
    "avatarUrl" TEXT,
    "passwordHash" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "brandName" TEXT,
    "industry" TEXT,
    "targetAudience" TEXT,
    "competitors" TEXT[],
    "monthlyRetainer" DOUBLE PRECISION,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "notes" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "aiMonthlyBudgetUsd" DOUBLE PRECISION,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAssignment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditProject" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AuditStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "overallScore" INTEGER,
    "competitorDomains" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditCheck" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "status" "AuditCheckStatus" NOT NULL DEFAULT 'PENDING',
    "score" INTEGER,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB,
    "aiSuggestion" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditNote" (
    "id" TEXT NOT NULL,
    "auditId" TEXT,
    "checkId" TEXT,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "mentions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformOptimization" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformOptimization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformCheck" (
    "id" TEXT NOT NULL,
    "optimizationId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "status" "CheckStatus" NOT NULL DEFAULT 'PENDING',
    "score" INTEGER,
    "notes" TEXT,
    "aiSuggestion" TEXT,
    "manualInput" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformScoreHistory" (
    "id" TEXT NOT NULL,
    "optimizationId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformScoreHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostDraft" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "platforms" "Platform"[],
    "caption" TEXT NOT NULL,
    "hashtags" TEXT[],
    "mediaUrls" TEXT[],
    "altTexts" TEXT[],
    "platformOverrides" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "performance" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentIdea" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "outline" TEXT NOT NULL,
    "status" "IdeaStatus" NOT NULL DEFAULT 'SAVED',
    "usedInPost" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "toolId" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HashtagSet" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "topic" TEXT NOT NULL,
    "niche" TEXT,
    "hashtags" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HashtagSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudiencePersona" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "demographics" JSONB NOT NULL,
    "psychographics" JSONB NOT NULL,
    "digitalBehavior" JSONB NOT NULL,
    "painPoints" TEXT[],
    "goals" TEXT[],
    "objections" TEXT[],
    "contentTriggers" TEXT[],
    "messagingGuide" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudiencePersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "platforms" JSONB NOT NULL,
    "automatedData" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedReport" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "period" TEXT NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "ClientAssignment_clientId_userId_key" ON "ClientAssignment"("clientId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformOptimization_clientId_platform_key" ON "PlatformOptimization"("clientId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformCheck_optimizationId_checkId_key" ON "PlatformCheck"("optimizationId", "checkId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAssignment" ADD CONSTRAINT "ClientAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAssignment" ADD CONSTRAINT "ClientAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditProject" ADD CONSTRAINT "AuditProject_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditCheck" ADD CONSTRAINT "AuditCheck_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "AuditProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditNote" ADD CONSTRAINT "AuditNote_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "AuditProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditNote" ADD CONSTRAINT "AuditNote_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "AuditCheck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditNote" ADD CONSTRAINT "AuditNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformOptimization" ADD CONSTRAINT "PlatformOptimization_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformCheck" ADD CONSTRAINT "PlatformCheck_optimizationId_fkey" FOREIGN KEY ("optimizationId") REFERENCES "PlatformOptimization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformScoreHistory" ADD CONSTRAINT "PlatformScoreHistory_optimizationId_fkey" FOREIGN KEY ("optimizationId") REFERENCES "PlatformOptimization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostDraft" ADD CONSTRAINT "PostDraft_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostDraft" ADD CONSTRAINT "PostDraft_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostDraft" ADD CONSTRAINT "PostDraft_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentIdea" ADD CONSTRAINT "ContentIdea_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HashtagSet" ADD CONSTRAINT "HashtagSet_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudiencePersona" ADD CONSTRAINT "AudiencePersona_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorProfile" ADD CONSTRAINT "CompetitorProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedReport" ADD CONSTRAINT "GeneratedReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

