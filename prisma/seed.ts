import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  learningPaths,
  challenges,
  officialCategories,
} from "../src/data/challenges";
import { defaultCreditProducts } from "../src/data/billing";
import { ACHIEVEMENT_DEFINITIONS } from "../src/lib/achievements";
import { creditsToMicrocredits } from "../src/lib/billing/units";
import { readFileSync } from "fs";
import { join } from "path";
import { seedAiModelPricing } from "./seed-ai-model-pricing";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

// Load Chinese content translations
const zhContent = JSON.parse(
  readFileSync(join(__dirname, "../messages/zh-content.json"), "utf-8")
).challengeContent as Record<string, { title: string; description: string; objectives: string[]; hints: string[] }>;

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // 1. Upsert official categories
  for (const cat of officialCategories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        order: cat.order,
        isOfficial: true,
      },
      create: {
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        order: cat.order,
        isOfficial: true,
      },
    });
  }
  console.log(`  Seeded ${officialCategories.length} categories.`);

  // 2. Upsert learning paths
  for (const path of learningPaths) {
    await prisma.learningPath.upsert({
      where: { slug: path.slug },
      update: {
        title: path.title,
        description: path.description,
        icon: path.icon,
        color: path.color,
        order: path.order,
      },
      create: {
        slug: path.slug,
        title: path.title,
        description: path.description,
        icon: path.icon,
        color: path.color,
        order: path.order,
      },
    });
    console.log(`  Path: ${path.title}`);
  }

  // Build lookup maps
  const categoryMap = new Map<string, string>();
  for (const c of await prisma.category.findMany()) {
    categoryMap.set(c.slug, c.id);
  }

  const pathMap = new Map<string, string>();
  for (const p of await prisma.learningPath.findMany()) {
    pathMap.set(p.slug, p.id);
  }

  // 3. Upsert challenges + tags
  for (const challenge of challenges) {
    const pathId = pathMap.get(challenge.pathSlug) ?? null;
    const categoryId = categoryMap.get(challenge.categorySlug) ?? null;

    const upserted = await prisma.challenge.upsert({
      where: { slug: challenge.slug },
      update: {
        title: challenge.title,
        description: challenge.description,
        difficulty: challenge.difficulty,
        objectives: challenge.objectives,
        hints: challenge.hints,
        resources: challenge.resources,
        estimatedTime: challenge.estimatedTime,
        order: challenge.order,
        isOfficial: true,
        categoryId,
        pathId,
      },
      create: {
        slug: challenge.slug,
        title: challenge.title,
        description: challenge.description,
        difficulty: challenge.difficulty,
        objectives: challenge.objectives,
        hints: challenge.hints,
        resources: challenge.resources,
        estimatedTime: challenge.estimatedTime,
        order: challenge.order,
        isOfficial: true,
        authorId: null,
        categoryId,
        pathId,
      },
    });

    // Sync tags: delete existing, re-create
    await prisma.challengeTag.deleteMany({
      where: { challengeId: upserted.id },
    });

    for (const tagName of challenge.tags) {
      const normalized = tagName.toLowerCase().trim();
      const tag = await prisma.tag.upsert({
        where: { name: normalized },
        update: {},
        create: { name: normalized },
      });
      await prisma.challengeTag.create({
        data: { challengeId: upserted.id, tagId: tag.id },
      });
    }

    // Upsert English translation from seed data
    await prisma.challengeTranslation.upsert({
      where: {
        challengeId_locale: { challengeId: upserted.id, locale: "en" },
      },
      update: {
        title: challenge.title,
        description: challenge.description,
        objectives: challenge.objectives,
        hints: challenge.hints,
      },
      create: {
        challengeId: upserted.id,
        locale: "en",
        title: challenge.title,
        description: challenge.description,
        objectives: challenge.objectives,
        hints: challenge.hints,
      },
    });

    // Upsert Chinese translation from zh-content.json
    const zh = zhContent[challenge.slug];
    if (zh) {
      await prisma.challengeTranslation.upsert({
        where: {
          challengeId_locale: { challengeId: upserted.id, locale: "zh" },
        },
        update: {
          title: zh.title,
          description: zh.description,
          objectives: zh.objectives,
          hints: zh.hints,
        },
        create: {
          challengeId: upserted.id,
          locale: "zh",
          title: zh.title,
          description: zh.description,
          objectives: zh.objectives,
          hints: zh.hints,
        },
      });
    }
  }

  console.log(`  Seeded ${challenges.length} challenges.`);

  // 4. Upsert achievements
  for (const achievement of ACHIEVEMENT_DEFINITIONS) {
    await prisma.achievement.upsert({
      where: { slug: achievement.slug },
      update: {
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        xpReward: achievement.xpReward,
        rarity: achievement.rarity,
      },
      create: {
        slug: achievement.slug,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        xpReward: achievement.xpReward,
        rarity: achievement.rarity,
      },
    });
  }
  console.log(`  Seeded ${ACHIEVEMENT_DEFINITIONS.length} achievements.`);

  // 5. Upsert default credit products
  for (const product of defaultCreditProducts) {
    await prisma.creditProduct.upsert({
      where: { code: product.code },
      update: {
        name: product.name,
        description: product.description,
        type: product.type,
        billingInterval: product.billingInterval,
        currency: product.currency,
        unitAmount: product.unitAmount,
        creditsMicrocredits: creditsToMicrocredits(product.credits),
        bonusMicrocredits: creditsToMicrocredits(product.bonusCredits),
        active: true,
        sortOrder: product.sortOrder,
      },
      create: {
        code: product.code,
        name: product.name,
        description: product.description,
        type: product.type,
        billingInterval: product.billingInterval,
        currency: product.currency,
        unitAmount: product.unitAmount,
        creditsMicrocredits: creditsToMicrocredits(product.credits),
        bonusMicrocredits: creditsToMicrocredits(product.bonusCredits),
        active: true,
        sortOrder: product.sortOrder,
      },
    });
  }
  console.log(`  Seeded ${defaultCreditProducts.length} credit products.`);

  // 6. Upsert default AI model pricing
  const seededPricingCount = await seedAiModelPricing(prisma);
  console.log(`  Seeded ${seededPricingCount} AI pricing rules.`);

  console.log("Done.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
