-- CreateEnum
CREATE TYPE "public"."Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."Role" ADD VALUE 'teacher';
ALTER TYPE "public"."Role" ADD VALUE 'student';

-- AlterTable
ALTER TABLE "public"."Message" ADD COLUMN     "quizId" TEXT;

-- CreateTable
CREATE TABLE "public"."Quiz" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "subject" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Question" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "difficulty" "public"."Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "embedding" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Submission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "suggestions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quiz_userId_idx" ON "public"."Quiz"("userId");

-- CreateIndex
CREATE INDEX "Question_quizId_idx" ON "public"."Question"("quizId");

-- CreateIndex
CREATE INDEX "Submission_userId_idx" ON "public"."Submission"("userId");

-- CreateIndex
CREATE INDEX "Submission_quizId_idx" ON "public"."Submission"("quizId");

-- CreateIndex
CREATE INDEX "Message_quizId_idx" ON "public"."Message"("quizId");

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Submission" ADD CONSTRAINT "Submission_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
