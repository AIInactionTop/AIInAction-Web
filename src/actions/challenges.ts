"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { awardXP, updateStreak } from "@/lib/gamification";
import { checkAndAwardAchievements } from "@/lib/achievements";
import { translateChallenge, type ChallengeContent } from "@/lib/ai";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function generateUniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let suffix = 0;
  while (await prisma.challenge.findUnique({ where: { slug } })) {
    suffix++;
    slug = `${slugify(base)}-${suffix}`;
  }
  return slug;
}

async function syncTags(challengeId: string, tagNames: string[]) {
  await prisma.challengeTag.deleteMany({ where: { challengeId } });
  for (const name of tagNames) {
    const normalized = name.toLowerCase().trim();
    if (!normalized) continue;
    const tag = await prisma.tag.upsert({
      where: { name: normalized },
      update: {},
      create: { name: normalized },
    });
    await prisma.challengeTag.create({
      data: { challengeId, tagId: tag.id },
    });
  }
}

export async function createChallenge(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const difficulty = formData.get("difficulty") as string;
  const categoryId = formData.get("categoryId") as string;
  const tagsRaw = formData.get("tags") as string;
  const objectives = formData.getAll("objectives") as string[];
  const hints = formData.getAll("hints") as string[];
  const resources = formData.getAll("resources") as string[];
  const estimatedTime = (formData.get("estimatedTime") as string) || null;
  const locale = (formData.get("locale") as string) || "en";

  const slug = await generateUniqueSlug(title);
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const filteredObjectives = objectives.filter(Boolean);
  const filteredHints = hints.filter(Boolean);

  const challenge = await prisma.challenge.create({
    data: {
      slug,
      title,
      description,
      difficulty: difficulty as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT",
      categoryId: categoryId || null,
      authorId: session.user.id,
      isOfficial: false,
      objectives: filteredObjectives,
      hints: filteredHints,
      resources: resources.filter(Boolean),
      estimatedTime,
    },
  });

  await syncTags(challenge.id, tags);

  // Create translation for current locale
  const content: ChallengeContent = {
    title,
    description,
    objectives: filteredObjectives,
    hints: filteredHints,
  };

  await prisma.challengeTranslation.create({
    data: { challengeId: challenge.id, locale, ...content },
  });

  // Auto-translate to the other locale
  const otherLocale = locale === "zh" ? "en" : "zh";
  try {
    const translated = await translateChallenge(content, locale, otherLocale);
    await prisma.challengeTranslation.create({
      data: { challengeId: challenge.id, locale: otherLocale, ...translated },
    });
  } catch {
    // Graceful degradation — translation will be missing for other locale
  }

  // Award XP for publishing a community challenge
  await updateStreak(session.user.id);
  await awardXP(session.user.id, 20);
  await checkAndAwardAchievements(session.user.id, "challenge_publish");

  revalidatePath("/challenges");
  redirect(`/challenges/${challenge.slug}`);
}

export async function updateChallenge(challengeId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!existing || existing.authorId !== session.user.id) {
    throw new Error("Forbidden");
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const difficulty = formData.get("difficulty") as string;
  const categoryId = formData.get("categoryId") as string;
  const tagsRaw = formData.get("tags") as string;
  const objectives = formData.getAll("objectives") as string[];
  const hints = formData.getAll("hints") as string[];
  const resources = formData.getAll("resources") as string[];
  const estimatedTime = (formData.get("estimatedTime") as string) || null;
  const locale = (formData.get("locale") as string) || "en";

  const filteredObjectives = objectives.filter(Boolean);
  const filteredHints = hints.filter(Boolean);
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  await prisma.challenge.update({
    where: { id: challengeId },
    data: {
      title,
      description,
      difficulty: difficulty as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT",
      categoryId: categoryId || null,
      objectives: filteredObjectives,
      hints: filteredHints,
      resources: resources.filter(Boolean),
      estimatedTime,
    },
  });

  await syncTags(challengeId, tags);

  // Upsert translation for current locale
  const content: ChallengeContent = {
    title,
    description,
    objectives: filteredObjectives,
    hints: filteredHints,
  };

  await prisma.challengeTranslation.upsert({
    where: { challengeId_locale: { challengeId, locale } },
    update: content,
    create: { challengeId, locale, ...content },
  });

  // Auto-translate to the other locale
  const otherLocale = locale === "zh" ? "en" : "zh";
  try {
    const translated = await translateChallenge(content, locale, otherLocale);
    await prisma.challengeTranslation.upsert({
      where: { challengeId_locale: { challengeId, locale: otherLocale } },
      update: translated,
      create: { challengeId, locale: otherLocale, ...translated },
    });
  } catch {
    // Graceful degradation
  }

  revalidatePath(`/challenges/${existing.slug}`);
  redirect(`/challenges/${existing.slug}`);
}

export async function deleteChallenge(challengeId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!existing || existing.authorId !== session.user.id) {
    throw new Error("Forbidden");
  }

  await prisma.challenge.delete({ where: { id: challengeId } });

  revalidatePath("/challenges");
  redirect("/challenges");
}

export async function forkChallenge(originalSlug: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const original = await prisma.challenge.findUnique({
    where: { slug: originalSlug },
    include: { tags: { include: { tag: true } }, translations: true },
  });
  if (!original) throw new Error("Challenge not found");

  const slug = await generateUniqueSlug(`${original.title}-fork`);

  const forked = await prisma.challenge.create({
    data: {
      slug,
      title: `${original.title} (Fork)`,
      description: original.description,
      difficulty: original.difficulty,
      categoryId: original.categoryId,
      authorId: session.user.id,
      forkedFromId: original.id,
      isOfficial: false,
      objectives: original.objectives,
      hints: original.hints,
      resources: original.resources,
      estimatedTime: original.estimatedTime,
    },
  });

  const tagNames = original.tags.map((ct) => ct.tag.name);
  await syncTags(forked.id, tagNames);

  // Copy translations from original challenge
  for (const t of original.translations) {
    await prisma.challengeTranslation.create({
      data: {
        challengeId: forked.id,
        locale: t.locale,
        title: t.locale === "en" ? `${t.title} (Fork)` : `${t.title}（分叉）`,
        description: t.description,
        objectives: t.objectives,
        hints: t.hints,
      },
    });
  }

  // Award XP for forking a challenge
  await updateStreak(session.user.id);
  await awardXP(session.user.id, 10);

  // Check fork-related achievements for original author
  if (original.authorId) {
    await checkAndAwardAchievements(original.authorId, "fork_received");
  }

  revalidatePath("/challenges");
  redirect(`/challenges/${forked.slug}/edit`);
}
