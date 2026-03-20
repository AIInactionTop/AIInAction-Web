"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function registerForChallenge(challengeId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.challengeRegistration.upsert({
    where: { userId_challengeId: { userId: session.user.id, challengeId } },
    update: {},
    create: { userId: session.user.id, challengeId },
  });

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { slug: true },
  });
  if (challenge) {
    revalidatePath(`/learn/challenges/${challenge.slug}`);
  }
}

export async function unregisterFromChallenge(challengeId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.challengeRegistration.delete({
    where: { userId_challengeId: { userId: session.user.id, challengeId } },
  });

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { slug: true },
  });
  if (challenge) {
    revalidatePath(`/learn/challenges/${challenge.slug}`);
  }
}
