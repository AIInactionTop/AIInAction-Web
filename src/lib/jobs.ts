import { prisma } from "./prisma";
import type { JobType, JobLocationType, JobStatus, Prisma } from "@prisma/client";

export type JobFilters = {
  type?: JobType;
  locationType?: JobLocationType;
  search?: string;
  status?: JobStatus;
  page?: number;
  pageSize?: number;
  sortBy?: "newest" | "salary";
};

export async function getJobs(filters: JobFilters = {}) {
  const {
    type,
    locationType,
    search,
    status = "OPEN",
    page = 1,
    pageSize = 20,
    sortBy = "newest",
  } = filters;

  const where: Prisma.JobWhereInput = { status };

  if (type) where.type = type;
  if (locationType) where.locationType = locationType;

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
      { skills: { hasSome: [search.toLowerCase()] } },
    ];
  }

  const orderBy: Prisma.JobOrderByWithRelationInput =
    sortBy === "salary" ? { salaryMax: "desc" } : { createdAt: "desc" };

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, image: true } },
        _count: { select: { applications: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.job.count({ where }),
  ]);

  return { jobs, total, page, pageSize };
}

export async function getJobBySlug(slug: string) {
  return prisma.job.findUnique({
    where: { slug },
    include: {
      author: { select: { id: true, name: true, image: true, githubUrl: true } },
      _count: { select: { applications: true } },
    },
  });
}

export async function getJobApplications(jobId: string) {
  return prisma.jobApplication.findMany({
    where: { jobId },
    include: {
      user: { select: { id: true, name: true, image: true, email: true, githubUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserApplications(userId: string) {
  return prisma.jobApplication.findMany({
    where: { userId },
    include: {
      job: {
        select: {
          id: true,
          slug: true,
          title: true,
          company: true,
          type: true,
          locationType: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserJobs(userId: string) {
  return prisma.job.findMany({
    where: { authorId: userId },
    include: {
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
