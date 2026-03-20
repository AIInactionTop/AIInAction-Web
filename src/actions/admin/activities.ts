"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getNextChallengeOrder } from "@/lib/admin-activities";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActivityType, ActivityStatus } from "@prisma/client";

function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100) +
    "-" +
    Date.now().toString(36)
  );
}

export async function createAdminActivity(formData: FormData) {
  const admin = await requireAdmin();

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const type = formData.get("type") as ActivityType;

  if (!title || !description || !type) {
    throw new Error("Title, description, and type are required");
  }

  const content = formData.get("content") as string | null;
  const externalUrl = formData.get("externalUrl") as string | null;
  const startDate = formData.get("startDate") as string | null;
  const endDate = formData.get("endDate") as string | null;
  const coverImage = formData.get("coverImage") as string | null;

  const activity = await prisma.activity.create({
    data: {
      slug: generateSlug(title),
      title,
      description,
      type,
      status: "DRAFT",
      content: content || null,
      externalUrl: externalUrl || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      coverImage: coverImage || null,
      authorId: admin.id!,
    },
  });

  revalidatePath("/admin/activities");
  redirect(`/admin/activities/${activity.id}`);
}

export async function updateAdminActivity(id: string, formData: FormData) {
  await requireAdmin();

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const type = formData.get("type") as ActivityType;
  const status = formData.get("status") as ActivityStatus;
  const content = formData.get("content") as string | null;
  const externalUrl = formData.get("externalUrl") as string | null;
  const startDate = formData.get("startDate") as string | null;
  const endDate = formData.get("endDate") as string | null;
  const coverImage = formData.get("coverImage") as string | null;

  await prisma.activity.update({
    where: { id },
    data: {
      title,
      description,
      type,
      status,
      content: content || null,
      externalUrl: externalUrl || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      coverImage: coverImage || null,
    },
  });

  revalidatePath("/admin/activities");
  revalidatePath(`/admin/activities/${id}`);
}

export async function deleteAdminActivity(id: string) {
  await requireAdmin();
  await prisma.activity.delete({ where: { id } });
  revalidatePath("/admin/activities");
  redirect("/admin/activities");
}

export async function updateActivityStatus(id: string, status: ActivityStatus) {
  await requireAdmin();
  await prisma.activity.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/admin/activities");
}

export async function addActivityChallenge(activityId: string, challengeId: string) {
  await requireAdmin();
  const order = await getNextChallengeOrder(activityId);
  await prisma.activityChallenge.create({
    data: { activityId, challengeId, order },
  });
  revalidatePath(`/admin/activities/${activityId}`);
}

export async function removeActivityChallenge(activityId: string, challengeId: string) {
  await requireAdmin();
  await prisma.activityChallenge.delete({
    where: { activityId_challengeId: { activityId, challengeId } },
  });
  revalidatePath(`/admin/activities/${activityId}`);
}

export async function reorderActivityChallenges(
  activityId: string,
  orderedChallengeIds: string[]
) {
  await requireAdmin();
  await prisma.$transaction(
    orderedChallengeIds.map((challengeId, index) =>
      prisma.activityChallenge.update({
        where: { activityId_challengeId: { activityId, challengeId } },
        data: { order: index },
      })
    )
  );
  revalidatePath(`/admin/activities/${activityId}`);
}
