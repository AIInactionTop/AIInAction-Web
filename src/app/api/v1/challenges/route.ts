import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import type { Difficulty } from "@prisma/client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const search = url.searchParams.get("search") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const difficultyParam = url.searchParams.get("difficulty");
  const official = url.searchParams.get("official");

  if (difficultyParam && !["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"].includes(difficultyParam)) {
    return jsonError("VALIDATION_ERROR", "difficulty must be one of: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT", 400);
  }
  const difficulty = difficultyParam as Difficulty | undefined;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  if (category) where.category = { slug: category };
  if (difficulty) where.difficulty = difficulty;
  if (official === "true") where.isOfficial = true;
  if (official === "false") where.isOfficial = false;

  const [challenges, total] = await Promise.all([
    prisma.challenge.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        difficulty: true,
        isOfficial: true,
        likesCount: true,
        estimatedTime: true,
        createdAt: true,
        category: { select: { slug: true, name: true } },
        author: { select: { id: true, name: true, image: true } },
        tags: { include: { tag: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.challenge.count({ where }),
  ]);

  const formatted = challenges.map((c) => ({
    ...c,
    tags: c.tags.map((t) => t.tag.name),
  }));

  return jsonSuccess({ challenges: formatted, total, page, limit });
}

export async function POST(request: Request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body) return jsonError("BAD_REQUEST", "Invalid JSON body", 400);

  const { title, description, difficulty, categoryId, tags, objectives, hints, resources, estimatedTime } = body as {
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

  if (!title || !description || !difficulty) {
    return jsonError("VALIDATION_ERROR", "title, description, and difficulty are required", 400);
  }

  const validDifficulties = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];
  if (!validDifficulties.includes(difficulty)) {
    return jsonError("VALIDATION_ERROR", `difficulty must be one of: ${validDifficulties.join(", ")}`, 400);
  }

  // Generate unique slug
  let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let suffix = 0;
  while (await prisma.challenge.findUnique({ where: { slug } })) {
    suffix++;
    slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${suffix}`;
  }

  const challenge = await prisma.challenge.create({
    data: {
      slug,
      title,
      description,
      difficulty: difficulty as Difficulty,
      categoryId: categoryId || null,
      authorId: user!.id,
      isOfficial: false,
      objectives: (objectives || []).filter(Boolean),
      hints: (hints || []).filter(Boolean),
      resources: (resources || []).filter(Boolean),
      estimatedTime: estimatedTime || null,
    },
  });

  // Sync tags
  if (tags?.length) {
    for (const name of tags) {
      const normalized = name.toLowerCase().trim();
      if (!normalized) continue;
      const tag = await prisma.tag.upsert({
        where: { name: normalized },
        update: {},
        create: { name: normalized },
      });
      await prisma.challengeTag.create({
        data: { challengeId: challenge.id, tagId: tag.id },
      });
    }
  }

  return jsonSuccess({
    id: challenge.id,
    slug: challenge.slug,
    title: challenge.title,
    url: `https://aiinaction.top/learn/challenges/${challenge.slug}`,
  }, 201);
}
