import { prisma } from "@/lib/prisma";
import type { EmailTemplateStatus } from "@prisma/client";

export async function getEmailTemplates(status?: EmailTemplateStatus) {
  const where = status ? { status } : { status: { not: "ARCHIVED" as EmailTemplateStatus } };
  return prisma.emailTemplate.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { sendLogs: true } },
    },
  });
}

export async function getEmailTemplate(id: string) {
  return prisma.emailTemplate.findUnique({
    where: { id },
    include: {
      _count: { select: { sendLogs: true } },
    },
  });
}

export type RecipientFilter = "all" | "active_30d" | "completed_challenge" | "has_project";

export async function getRecipientCount(filter: RecipientFilter): Promise<number> {
  switch (filter) {
    case "all":
      return prisma.user.count({ where: { email: { not: null } } });
    case "active_30d": {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return prisma.user.count({
        where: {
          email: { not: null },
          stats: { lastActiveDate: { gte: thirtyDaysAgo } },
        },
      });
    }
    case "completed_challenge":
      return prisma.user.count({
        where: {
          email: { not: null },
          completions: { some: {} },
        },
      });
    case "has_project":
      return prisma.user.count({
        where: {
          email: { not: null },
          projects: { some: {} },
        },
      });
    default:
      return 0;
  }
}

export async function getRecipientsByFilter(filter: RecipientFilter) {
  const baseWhere = { email: { not: null } } as const;

  switch (filter) {
    case "all":
      return prisma.user.findMany({
        where: baseWhere,
        select: { id: true, name: true, email: true },
      });
    case "active_30d": {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return prisma.user.findMany({
        where: { ...baseWhere, stats: { lastActiveDate: { gte: thirtyDaysAgo } } },
        select: { id: true, name: true, email: true },
      });
    }
    case "completed_challenge":
      return prisma.user.findMany({
        where: { ...baseWhere, completions: { some: {} } },
        select: { id: true, name: true, email: true },
      });
    case "has_project":
      return prisma.user.findMany({
        where: { ...baseWhere, projects: { some: {} } },
        select: { id: true, name: true, email: true },
      });
    default:
      return [];
  }
}

export async function getEmailSendLogs(page = 1, pageSize = 20) {
  const [logs, total] = await Promise.all([
    prisma.emailSendLog.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        template: { select: { name: true, subject: true } },
        sentBy: { select: { name: true, email: true, image: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.emailSendLog.count(),
  ]);
  return { logs, total, page, pageSize };
}
