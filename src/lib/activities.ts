import { prisma } from "@/lib/prisma";
import type { ActivityType, ActivityStatus } from "@prisma/client";

export type ActivityFilters = {
  type?: ActivityType;
  status?: ActivityStatus;
  search?: string;
  page?: number;
  pageSize?: number;
};

const activityInclude = {
  author: { select: { id: true, name: true, image: true } },
  challenges: {
    include: {
      challenge: {
        select: { id: true, slug: true, title: true, difficulty: true },
      },
    },
    orderBy: { order: "asc" as const },
  },
  translations: true,
};

export function isAdmin(userId: string): boolean {
  const adminIds = (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return adminIds.includes(userId);
}

export async function getActivities(filters: ActivityFilters = {}) {
  const { type, status, search, page = 1, pageSize = 12 } = filters;

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: activityInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.activity.count({ where }),
  ]);

  return { activities, total, page, pageSize };
}

export async function getActivityBySlug(slug: string) {
  return prisma.activity.findUnique({
    where: { slug },
    include: activityInclude,
  });
}

export async function getActiveActivities() {
  return prisma.activity.findMany({
    where: { status: "ACTIVE" },
    include: activityInclude,
    orderBy: { startDate: "asc" },
  });
}

export async function getUpcomingActivities() {
  return prisma.activity.findMany({
    where: { status: "UPCOMING" },
    include: activityInclude,
    orderBy: { startDate: "asc" },
  });
}
