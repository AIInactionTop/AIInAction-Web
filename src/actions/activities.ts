"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/activities";
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

export async function createActivity(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!isAdmin(session.user.id)) throw new Error("Forbidden: admin only");

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const type = formData.get("type") as ActivityType;
  const content = formData.get("content") as string | null;
  const externalUrl = formData.get("externalUrl") as string | null;
  const startDate = formData.get("startDate") as string | null;
  const endDate = formData.get("endDate") as string | null;
  const coverImage = formData.get("coverImage") as string | null;

  const slug = generateSlug(title);

  const activity = await prisma.activity.create({
    data: {
      slug,
      title,
      description,
      type,
      status: "DRAFT",
      content: content || null,
      externalUrl: externalUrl || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      coverImage: coverImage || null,
      authorId: session.user.id,
    },
  });

  revalidatePath("/learn/activities", "layout");
  redirect(`/learn/activities/${activity.slug}`);
}

export async function updateActivity(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.activity.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");
  if (existing.authorId !== session.user.id && !isAdmin(session.user.id)) {
    throw new Error("Forbidden");
  }

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

  revalidatePath("/learn/activities", "layout");
  redirect(`/learn/activities/${existing.slug}`);
}

export async function deleteActivity(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.activity.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");
  if (existing.authorId !== session.user.id && !isAdmin(session.user.id)) {
    throw new Error("Forbidden");
  }

  await prisma.activity.delete({ where: { id } });
  revalidatePath("/learn/activities", "layout");
  redirect("/learn/activities");
}
