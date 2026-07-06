-- CreateEnum
CREATE TYPE "IdeaSource" AS ENUM ('MANUAL', 'AI_TREND');

-- CreateEnum
CREATE TYPE "ActionItemSource" AS ENUM ('TEAM', 'AI_SUGGESTED');

-- AlterTable
ALTER TABLE "ContentIdea" ADD COLUMN     "source" "IdeaSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "trendRationale" TEXT,
ADD COLUMN     "sourceRefs" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ClientActionItem" ADD COLUMN     "source" "ActionItemSource" NOT NULL DEFAULT 'TEAM',
ADD COLUMN     "contentIdeaId" TEXT;

-- AddForeignKey
ALTER TABLE "ClientActionItem" ADD CONSTRAINT "ClientActionItem_contentIdeaId_fkey" FOREIGN KEY ("contentIdeaId") REFERENCES "ContentIdea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
