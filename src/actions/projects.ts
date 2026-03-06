"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { awardXP, updateStreak } from "@/lib/gamification";
import { checkAndAwardAchievements } from "@/lib/achievements";

export async function createProject(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const githubUrl = formData.get("githubUrl") as string;
  const demoUrl = (formData.get("demoUrl") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || null;
  const tagsRaw = formData.get("tags") as string;
  const challengeSlug = formData.get("challengeSlug") as string | null;

  if (!title?.trim() || !description?.trim()) {
    throw new Error("Title, description are required");
  }

  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  let challengeId: string | undefined;
  if (challengeSlug) {
    const challenge = await prisma.challenge.findUnique({
      where: { slug: challengeSlug },
      select: { id: true },
    });
    if (challenge) {
      challengeId = challenge.id;
    }
  }

  await prisma.sharedProject.create({
    data: {
      userId: session.user.id,
      title: title.trim(),
      description: description.trim(),
      githubUrl: githubUrl.trim(),
      demoUrl: demoUrl?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      tags,
      ...(challengeId ? { challengeId } : {}),
    },
  });

  // Award XP for sharing a project
  await updateStreak(session.user.id);
  await awardXP(session.user.id, 15);
  await checkAndAwardAchievements(session.user.id, "project_share");

  revalidatePath("/showcase");
  if (challengeSlug) {
    revalidatePath(`/challenges/${challengeSlug}`);
  }
}

export async function toggleProjectLike(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.sharedProjectLike.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.sharedProjectLike.delete({
        where: { userId_projectId: { userId: session.user.id, projectId } },
      }),
      prisma.sharedProject.update({
        where: { id: projectId },
        data: { likes: { decrement: 1 } },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.sharedProjectLike.create({
        data: { userId: session.user.id, projectId },
      }),
      prisma.sharedProject.update({
        where: { id: projectId },
        data: { likes: { increment: 1 } },
      }),
    ]);
  }

  revalidatePath("/showcase");
}

export async function hasUserLikedProject(projectId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;

  const like = await prisma.sharedProjectLike.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId } },
  });
  return !!like;
}

export async function updateProject(projectId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.sharedProject.findUnique({
    where: { id: projectId },
  });
  if (!existing || existing.userId !== session.user.id) {
    throw new Error("Forbidden");
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const githubUrl = formData.get("githubUrl") as string;
  const demoUrl = (formData.get("demoUrl") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || null;
  const tagsRaw = formData.get("tags") as string;

  if (!title?.trim() || !description?.trim()) {
    throw new Error("Title, description are required");
  }

  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  await prisma.sharedProject.update({
    where: { id: projectId },
    data: {
      title: title.trim(),
      description: description.trim(),
      githubUrl: githubUrl.trim(),
      demoUrl: demoUrl?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      tags,
    },
  });

  revalidatePath("/showcase");
  revalidatePath(`/showcase/${projectId}`);
}

export async function deleteProject(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.sharedProject.findUnique({
    where: { id: projectId },
  });
  if (!existing || existing.userId !== session.user.id) {
    throw new Error("Forbidden");
  }

  await prisma.sharedProject.delete({
    where: { id: projectId },
  });

  revalidatePath("/showcase");
}

export async function getProjectById(projectId: string) {
  return prisma.sharedProject.findUnique({
    where: { id: projectId },
    include: {
      user: { select: { id: true, name: true, image: true, githubUrl: true } },
      challenge: { select: { id: true, slug: true, title: true } },
    },
  });
}
