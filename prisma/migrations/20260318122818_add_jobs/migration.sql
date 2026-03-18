-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "JobLocationType" AS ENUM ('REMOTE', 'ONSITE', 'HYBRID');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('OPEN', 'CLOSED', 'DRAFT');

-- CreateEnum
CREATE TYPE "JobApplicationStatus" AS ENUM ('PENDING', 'REVIEWING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "company_url" TEXT,
    "company_logo" TEXT,
    "location" TEXT,
    "location_type" "JobLocationType" NOT NULL DEFAULT 'REMOTE',
    "type" "JobType" NOT NULL DEFAULT 'FULL_TIME',
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "salary_currency" TEXT NOT NULL DEFAULT 'USD',
    "skills" TEXT[],
    "contact_email" TEXT,
    "apply_url" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'OPEN',
    "author_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_applications" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cover_letter" TEXT,
    "resume_url" TEXT,
    "status" "JobApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jobs_slug_key" ON "jobs"("slug");

-- CreateIndex
CREATE INDEX "jobs_status_created_at_idx" ON "jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "job_applications_user_id_status_idx" ON "job_applications"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "job_applications_job_id_user_id_key" ON "job_applications"("job_id", "user_id");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
