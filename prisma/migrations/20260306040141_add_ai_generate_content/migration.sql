-- AlterTable
ALTER TABLE "challenge_translations" ADD COLUMN     "knowledge_content" TEXT;

-- AlterTable
ALTER TABLE "challenges" ADD COLUMN     "is_draft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "knowledge_content" TEXT;

-- AlterTable
ALTER TABLE "learning_paths" ADD COLUMN     "author_id" TEXT,
ADD COLUMN     "is_official" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_published" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
