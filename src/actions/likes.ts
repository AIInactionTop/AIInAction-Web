"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleLike(challengeId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.challengeLike.findUnique({
    where: { userId_challengeId: { userId: session.user.id, challengeId } },
  });

  if (existing) {
    await prisma.challengeLike.delete({
      where: { userId_challengeId: { userId: session.user.id, challengeId } },
    });
    await prisma.challenge.update({
      where: { id: challengeId },
      data: { likesCount: { decrement: 1 } },
    });
  } else {
    await prisma.challengeLike.create({
      data: { userId: session.user.id, challengeId },
    });
    await prisma.challenge.update({
      where: { id: challengeId },
      data: { likesCount: { increment: 1 } },
    });
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { slug: true },
  });
  if (challenge) {
    revalidatePath(`/learn/challenges/${challenge.slug}`);
  }
}
