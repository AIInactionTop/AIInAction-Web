/*
  Warnings:

  - You are about to drop the column `department` on the `organization_members` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[invite_token_id]` on the table `survey_responses` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "organization_members" DROP COLUMN "department",
ADD COLUMN     "department_1" TEXT,
ADD COLUMN     "department_2" TEXT,
ADD COLUMN     "department_3" TEXT;

-- AlterTable
ALTER TABLE "survey_responses" ADD COLUMN     "invite_token_id" TEXT;

-- CreateTable
CREATE TABLE "survey_invite_tokens" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_invite_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "survey_invite_tokens_token_key" ON "survey_invite_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "survey_invite_tokens_survey_id_member_id_key" ON "survey_invite_tokens"("survey_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "survey_responses_invite_token_id_key" ON "survey_responses"("invite_token_id");

-- AddForeignKey
ALTER TABLE "survey_invite_tokens" ADD CONSTRAINT "survey_invite_tokens_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_invite_tokens" ADD CONSTRAINT "survey_invite_tokens_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "organization_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
