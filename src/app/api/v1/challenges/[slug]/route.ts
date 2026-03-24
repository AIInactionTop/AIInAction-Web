import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import type { Difficulty } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    include: {
      category: { select: { slug: true, name: true } },
      author: { select: { id: true, name: true, image: true } },
      tags: { include: { tag: { select: { name: true } } } },
      forkedFrom: { select: { slug: true, title: true } },
    },
  });

  if (!challenge) {
    return jsonError("NOT_FOUND", "Challenge not found", 404);
  }

  return jsonSuccess({
    id: challenge.id,
    slug: challenge.slug,
    title: challenge.title,
    description: challenge.description,
    difficulty: challenge.difficulty,
    objectives: challenge.objectives,
    hints: challenge.hints,
    resources: challenge.resources,
    estimatedTime: challenge.estimatedTime,
    isOfficial: challenge.isOfficial,
    likesCount: challenge.likesCount,
    createdAt: challenge.createdAt,
    category: challenge.category,
    author: challenge.author,
    tags: challenge.tags.map((t) => t.tag.name),
    forkedFrom: challenge.forkedFrom,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const existing = await prisma.challenge.findUnique({ where: { slug } });
  if (!existing) return jsonError("NOT_FOUND", "Challenge not found", 404);
  if (existing.authorId !== user!.id)
    return jsonError(
      "FORBIDDEN",
      "You can only edit your own challenges",
      403
    );

  const body = await request.json().catch(() => null);
  if (!body) return jsonError("BAD_REQUEST", "Invalid JSON body", 400);

  const {
    title,
    description,
    difficulty,
    categoryId,
    tags,
    objectives,
    hints,
    resources,
    estimatedTime,
  } = body as {
    title?: string;
    description?: string;
    difficulty?: string;
    categoryId?: string;
    tags?: string[];
    objectives?: string[];
    hints?: string[];
    resources?: string[];
    estimatedTime?: string;
  };

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (difficulty !== undefined) {
    const validDifficulties = [
      "BEGINNER",
      "INTERMEDIATE",
      "ADVANCED",
      "EXPERT",
    ];
    if (!validDifficulties.includes(difficulty)) {
      return jsonError(
        "VALIDATION_ERROR",
        `difficulty must be one of: ${validDifficulties.join(", ")}`,
        400
      );
    }
    updateData.difficulty = difficulty as Difficulty;
  }
  if (categoryId !== undefined) updateData.categoryId = categoryId || null;
  if (objectives !== undefined)
    updateData.objectives = objectives.filter(Boolean);
  if (hints !== undefined) updateData.hints = hints.filter(Boolean);
  if (resources !== undefined) updateData.resources = resources.filter(Boolean);
  if (estimatedTime !== undefined)
    updateData.estimatedTime = estimatedTime || null;

  const updated = await prisma.challenge.update({
    where: { id: existing.id },
    data: updateData,
  });

  // Sync tags if provided
  if (tags) {
    await prisma.challengeTag.deleteMany({
      where: { challengeId: existing.id },
    });
    for (const name of tags) {
      const normalized = name.toLowerCase().trim();
      if (!normalized) continue;
      const tag = await prisma.tag.upsert({
        where: { name: normalized },
        update: {},
        create: { name: normalized },
      });
      await prisma.challengeTag.create({
        data: { challengeId: existing.id, tagId: tag.id },
      });
    }
  }

  return jsonSuccess({
    id: updated.id,
    slug: updated.slug,
    title: updated.title,
    url: `https://aiinaction.top/learn/challenges/${updated.slug}`,
  });
}
