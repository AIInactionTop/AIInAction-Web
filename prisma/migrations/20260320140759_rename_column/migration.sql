/*
  Warnings:

  - You are about to drop the column `generatedAt` on the `diagnostic_reports` table. All the data in the column will be lost.
  - You are about to drop the column `acceptedAt` on the `organization_invites` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `organization_invites` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `organization_invites` table. All the data in the column will be lost.
  - You are about to drop the column `joinedAt` on the `organization_members` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `organizations` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `organizations` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `roi_estimates` table. All the data in the column will be lost.
  - You are about to drop the column `submittedAt` on the `survey_responses` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `surveys` table. All the data in the column will be lost.
  - You are about to drop the column `endsAt` on the `surveys` table. All the data in the column will be lost.
  - You are about to drop the column `startsAt` on the `surveys` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `surveys` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `training_plans` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `transformation_progress` table. All the data in the column will be lost.
  - Added the required column `expires_at` to the `organization_invites` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `organizations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `surveys` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "diagnostic_reports_organization_id_generatedAt_idx";

-- DropIndex
DROP INDEX "survey_responses_survey_id_submittedAt_idx";

-- AlterTable
ALTER TABLE "diagnostic_reports" DROP COLUMN "generatedAt",
ADD COLUMN     "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "organization_invites" DROP COLUMN "acceptedAt",
DROP COLUMN "createdAt",
DROP COLUMN "expiresAt",
ADD COLUMN     "accepted_at" TIMESTAMP(3),
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "organization_members" DROP COLUMN "joinedAt",
ADD COLUMN     "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "organizations" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "roi_estimates" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "survey_responses" DROP COLUMN "submittedAt",
ADD COLUMN     "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "surveys" DROP COLUMN "createdAt",
DROP COLUMN "endsAt",
DROP COLUMN "startsAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "ends_at" TIMESTAMP(3),
ADD COLUMN     "starts_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "training_plans" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "transformation_progress" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "diagnostic_reports_organization_id_generated_at_idx" ON "diagnostic_reports"("organization_id", "generated_at");

-- CreateIndex
CREATE INDEX "survey_responses_survey_id_submitted_at_idx" ON "survey_responses"("survey_id", "submitted_at");
