-- AlterTable
ALTER TABLE "shared_projects" ADD COLUMN     "image_url" TEXT;

-- CreateTable
CREATE TABLE "shared_project_likes" (
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_project_likes_pkey" PRIMARY KEY ("user_id","project_id")
);

-- AddForeignKey
ALTER TABLE "shared_project_likes" ADD CONSTRAINT "shared_project_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_project_likes" ADD CONSTRAINT "shared_project_likes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "shared_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
