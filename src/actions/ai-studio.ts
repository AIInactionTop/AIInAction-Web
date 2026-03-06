"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { translateChallenge, type ChallengeContent } from "@/lib/ai";
import { awardXP } from "@/lib/gamification";
import { Difficulty } from "@prisma/client";

type ChallengeInput = {
  title: string;
  description: string;
  difficulty: string;
  objectives: string[];
  hints: string[];
  resources: string[];
  tags: string[];
  estimatedTime: string;
  knowledgeContent: string;
  order: number;
};

type SavePathInput = {
  title: string;
  description: string;
  icon: string;
  color: string;
  categorySlug: string;
  challenges: ChallengeInput[];
  isPublished: boolean;
  locale: string;
};

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function saveAILearningPath(input: SavePathInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const category = await prisma.category.findUnique({
    where: { slug: input.categorySlug },
  });

  let pathSlug = generateSlug(input.title);
  const existingPath = await prisma.learningPath.findUnique({ where: { slug: pathSlug } });
  if (existingPath) {
    pathSlug = `${pathSlug}-${Date.now().toString(36)}`;
  }

  const learningPath = await prisma.learningPath.create({
    data: {
      slug: pathSlug,
      title: input.title,
      description: input.description,
      icon: input.icon,
      color: input.color,
      authorId: userId,
      isOfficial: false,
      isPublished: input.isPublished,
    },
  });

  const targetLocale = input.locale === "en" ? "zh" : "en";

  for (const ch of input.challenges) {
    let challengeSlug = generateSlug(ch.title);
    const existingChallenge = await prisma.challenge.findUnique({ where: { slug: challengeSlug } });
    if (existingChallenge) {
      challengeSlug = `${challengeSlug}-${Date.now().toString(36)}`;
    }

    const challenge = await prisma.challenge.create({
      data: {
        slug: challengeSlug,
        title: ch.title,
        description: ch.description,
        difficulty: ch.difficulty as Difficulty,
        objectives: ch.objectives,
        hints: ch.hints,
        resources: ch.resources,
        estimatedTime: ch.estimatedTime,
        knowledgeContent: ch.knowledgeContent,
        isDraft: !input.isPublished,
        order: ch.order,
        isOfficial: false,
        authorId: userId,
        categoryId: category?.id,
        pathId: learningPath.id,
      },
    });

    for (const tagName of ch.tags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName.toLowerCase().trim() },
        update: {},
        create: { name: tagName.toLowerCase().trim() },
      });
      await prisma.challengeTag.create({
        data: { challengeId: challenge.id, tagId: tag.id },
      });
    }

    await prisma.challengeTranslation.create({
      data: {
        challengeId: challenge.id,
        locale: input.locale,
        title: ch.title,
        description: ch.description,
        objectives: ch.objectives,
        hints: ch.hints,
        knowledgeContent: ch.knowledgeContent,
      },
    });

    try {
      const sourceContent: ChallengeContent = {
        title: ch.title,
        description: ch.description,
        objectives: ch.objectives,
        hints: ch.hints,
      };
      const translated = await translateChallenge(sourceContent, input.locale, targetLocale);
      await prisma.challengeTranslation.create({
        data: {
          challengeId: challenge.id,
          locale: targetLocale,
          title: translated.title,
          description: translated.description,
          objectives: translated.objectives,
          hints: translated.hints,
        },
      });
    } catch {
      // Translation failure is non-fatal
    }
  }

  await awardXP(userId, 50);

  revalidatePath("/paths");
  revalidatePath("/challenges");

  if (input.isPublished) {
    redirect(`/paths/${pathSlug}`);
  }

  return { pathSlug, pathId: learningPath.id };
}
