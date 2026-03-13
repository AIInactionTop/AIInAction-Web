import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { resolve } from "path";
import { pathToFileURL } from "url";
import { creditsToMicrocredits } from "../src/lib/billing/units";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

type SeedDbClient = PrismaClient | Prisma.TransactionClient;

type AiModelPricingSeedEntry = {
  provider: string;
  model: string;
  displayName: string;
  promptCreditsPerMillion: string;
  completionCreditsPerMillion: string;
  cacheWriteCreditsPerMillion?: string;
  cacheReadCreditsPerMillion?: string;
  minimumChargeCredits?: string;
  metadata?: Prisma.InputJsonValue;
};

export const aiModelPricingSeedData: readonly AiModelPricingSeedEntry[] = [
  {
    provider: "openai",
    model: "gpt-5.4",
    displayName: "GPT-5.4",
    promptCreditsPerMillion: "2.5",
    completionCreditsPerMillion: "15",
    cacheReadCreditsPerMillion: "0.25",
    minimumChargeCredits: "0",
    metadata: {
      currency: "usd",
      unit: "per_1m_tokens",
      verifiedAt: "2026-03-09",
      sourceUrls: ["https://openai.com/api/pricing/"],
      notes: [
        "Cached input is mapped to cacheReadCreditsPerMillion in this schema.",
        "Base pricing is seeded. OpenAI charges a higher tier for very long contexts above 272k input tokens.",
      ],
    },
  },
  {
    provider: "openai",
    model: "gpt-5-mini",
    displayName: "GPT-5 Mini",
    promptCreditsPerMillion: "0.25",
    completionCreditsPerMillion: "2",
    cacheReadCreditsPerMillion: "0.025",
    minimumChargeCredits: "0",
    metadata: {
      currency: "usd",
      unit: "per_1m_tokens",
      verifiedAt: "2026-03-09",
      sourceUrls: [
        "https://openai.com/api/pricing/",
        "https://platform.openai.com/docs/models/gpt-5-mini",
      ],
      notes: [
        "Cached input is mapped to cacheReadCreditsPerMillion in this schema.",
      ],
    },
  },
  {
    provider: "openai",
    model: "gpt-4.1",
    displayName: "GPT-4.1",
    promptCreditsPerMillion: "2",
    completionCreditsPerMillion: "8",
    cacheReadCreditsPerMillion: "0.5",
    minimumChargeCredits: "0",
    metadata: {
      currency: "usd",
      unit: "per_1m_tokens",
      verifiedAt: "2026-03-09",
      sourceUrls: [
        "https://openai.com/api/pricing/",
        "https://platform.openai.com/docs/models/gpt-4.1",
      ],
      notes: [
        "Cached input is mapped to cacheReadCreditsPerMillion in this schema.",
      ],
    },
  },
  {
    provider: "anthropic",
    model: "claude-opus-4-1",
    displayName: "Claude Opus 4.1",
    promptCreditsPerMillion: "15",
    completionCreditsPerMillion: "75",
    cacheWriteCreditsPerMillion: "18.75",
    cacheReadCreditsPerMillion: "1.5",
    minimumChargeCredits: "0",
    metadata: {
      currency: "usd",
      unit: "per_1m_tokens",
      verifiedAt: "2026-03-09",
      sourceUrls: ["https://docs.anthropic.com/en/docs/about-claude/pricing"],
      notes: [
        "Cache write pricing uses Anthropic's 5-minute prompt cache tier.",
      ],
    },
  },
  {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    displayName: "Claude Sonnet 4.6",
    promptCreditsPerMillion: "3",
    completionCreditsPerMillion: "15",
    cacheWriteCreditsPerMillion: "3.75",
    cacheReadCreditsPerMillion: "0.3",
    minimumChargeCredits: "0",
    metadata: {
      currency: "usd",
      unit: "per_1m_tokens",
      verifiedAt: "2026-03-09",
      sourceUrls: ["https://docs.anthropic.com/en/docs/about-claude/pricing"],
      notes: [
        "Cache write pricing uses Anthropic's 5-minute prompt cache tier.",
      ],
    },
  },
  {
    provider: "anthropic",
    model: "claude-haiku-4-5",
    displayName: "Claude Haiku 4.5",
    promptCreditsPerMillion: "1",
    completionCreditsPerMillion: "5",
    cacheWriteCreditsPerMillion: "1.25",
    cacheReadCreditsPerMillion: "0.1",
    minimumChargeCredits: "0",
    metadata: {
      currency: "usd",
      unit: "per_1m_tokens",
      verifiedAt: "2026-03-09",
      sourceUrls: [
        "https://platform.claude.com/docs/en/about-claude/pricing",
        "https://www.anthropic.com/news/claude-haiku-4-5",
      ],
      notes: [
        "Cache write pricing uses Anthropic's 5-minute prompt cache tier.",
      ],
    },
  },
  {
    provider: "google",
    model: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    promptCreditsPerMillion: "1.25",
    completionCreditsPerMillion: "10",
    cacheReadCreditsPerMillion: "0.125",
    minimumChargeCredits: "0",
    metadata: {
      currency: "usd",
      unit: "per_1m_tokens",
      verifiedAt: "2026-03-09",
      sourceUrls: [
        "https://ai.google.dev/gemini-api/docs/pricing",
        "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-pro",
      ],
      longContextRates: {
        promptCreditsPerMillion: "2.5",
        completionCreditsPerMillion: "15",
        cacheReadCreditsPerMillion: "0.25",
        thresholdTokens: 200000,
      },
      cacheStorageCreditsPerMillionTokensPerHour: "1",
      notes: [
        "Base pricing is seeded for prompts up to 200k tokens.",
        "Google charges context-cache storage separately; that storage fee is captured in metadata only.",
      ],
    },
  },
  {
    provider: "google",
    model: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    promptCreditsPerMillion: "0.3",
    completionCreditsPerMillion: "2.5",
    cacheReadCreditsPerMillion: "0.125",
    minimumChargeCredits: "0",
    metadata: {
      currency: "usd",
      unit: "per_1m_tokens",
      verifiedAt: "2026-03-09",
      sourceUrls: ["https://ai.google.dev/gemini-api/docs/pricing"],
      longContextRates: {
        cacheReadCreditsPerMillion: "0.25",
        thresholdTokens: 200000,
      },
      cacheStorageCreditsPerMillionTokensPerHour: "1",
      notes: [
        "Google charges context-cache storage separately; that storage fee is captured in metadata only.",
      ],
    },
  },
  {
    provider: "google",
    model: "gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash",
    promptCreditsPerMillion: "0.1",
    completionCreditsPerMillion: "0.4",
    minimumChargeCredits: "0",
    metadata: {
      currency: "usd",
      unit: "per_1m_tokens",
      verifiedAt: "2026-03-09",
      sourceUrls: ["https://ai.google.dev/gemini-api/docs/pricing"],
      notes: [
        "No prompt-cache rate was seeded for this legacy model because the current schema does not represent Google's storage-based cache pricing cleanly.",
      ],
    },
  },
  {
    provider: "deepseek",
    model: "deepseek-chat",
    displayName: "DeepSeek Chat",
    promptCreditsPerMillion: "0.28",
    completionCreditsPerMillion: "0.42",
    cacheReadCreditsPerMillion: "0.028",
    minimumChargeCredits: "0",
    metadata: {
      currency: "usd",
      unit: "per_1m_tokens",
      verifiedAt: "2026-03-09",
      sourceUrls: ["https://api-docs.deepseek.com/quick_start/pricing/"],
      notes: [
        "DeepSeek uses automatic context caching. Cache-hit pricing is mapped to cacheReadCreditsPerMillion.",
      ],
    },
  },
  {
    provider: "deepseek",
    model: "deepseek-reasoner",
    displayName: "DeepSeek Reasoner",
    promptCreditsPerMillion: "0.28",
    completionCreditsPerMillion: "0.42",
    cacheReadCreditsPerMillion: "0.028",
    minimumChargeCredits: "0",
    metadata: {
      currency: "usd",
      unit: "per_1m_tokens",
      verifiedAt: "2026-03-09",
      sourceUrls: ["https://api-docs.deepseek.com/quick_start/pricing/"],
      notes: [
        "DeepSeek uses automatic context caching. Cache-hit pricing is mapped to cacheReadCreditsPerMillion.",
      ],
    },
  },
  {
    provider: "xai",
    model: "grok-4-0709",
    displayName: "Grok 4",
    promptCreditsPerMillion: "3",
    completionCreditsPerMillion: "15",
    cacheReadCreditsPerMillion: "0.75",
    minimumChargeCredits: "0",
    metadata: {
      currency: "usd",
      unit: "per_1m_tokens",
      verifiedAt: "2026-03-09",
      sourceUrls: ["https://docs.x.ai/docs/models?cluster=us-west-1"],
      notes: [
        "Cached token pricing is mapped to cacheReadCreditsPerMillion in this schema.",
      ],
    },
  },
  {
    provider: "xai",
    model: "grok-3-mini",
    displayName: "Grok 3 Mini",
    promptCreditsPerMillion: "0.3",
    completionCreditsPerMillion: "0.5",
    cacheReadCreditsPerMillion: "0.07",
    minimumChargeCredits: "0",
    metadata: {
      currency: "usd",
      unit: "per_1m_tokens",
      verifiedAt: "2026-03-09",
      sourceUrls: ["https://docs.x.ai/docs/models?cluster=us-west-1"],
      notes: [
        "Cached token pricing is mapped to cacheReadCreditsPerMillion in this schema.",
      ],
    },
  },
  {
    provider: "mistral",
    model: "mistral-large-3-25-12",
    displayName: "Mistral Large 3",
    promptCreditsPerMillion: "0.5",
    completionCreditsPerMillion: "1.5",
    minimumChargeCredits: "0",
    metadata: {
      currency: "usd",
      unit: "per_1m_tokens",
      verifiedAt: "2026-03-09",
      sourceUrls: [
        "https://docs.mistral.ai/deployment/laplateforme/pricing",
        "https://docs.mistral.ai/models/mistral-large-3-25-12",
      ],
    },
  },
  {
    provider: "mistral",
    model: "mistral-small-3-2-25-06",
    displayName: "Mistral Small 3.2",
    promptCreditsPerMillion: "0.1",
    completionCreditsPerMillion: "0.3",
    minimumChargeCredits: "0",
    metadata: {
      currency: "usd",
      unit: "per_1m_tokens",
      verifiedAt: "2026-03-09",
      sourceUrls: [
        "https://docs.mistral.ai/deployment/laplateforme/pricing",
        "https://docs.mistral.ai/models/mistral-small-3-2-25-06",
      ],
    },
  },
  {
    provider: "mistral",
    model: "codestral-2508",
    displayName: "Codestral 2508",
    promptCreditsPerMillion: "0.3",
    completionCreditsPerMillion: "0.9",
    minimumChargeCredits: "0",
    metadata: {
      currency: "usd",
      unit: "per_1m_tokens",
      verifiedAt: "2026-03-09",
      sourceUrls: [
        "https://docs.mistral.ai/deployment/laplateforme/pricing",
        "https://docs.mistral.ai/models/codestral-25-08",
      ],
    },
  },
] as const;

export async function seedAiModelPricing(prisma: SeedDbClient) {
  for (const pricing of aiModelPricingSeedData) {
    await prisma.aiModelPricing.upsert({
      where: {
        provider_model: {
          provider: pricing.provider,
          model: pricing.model,
        },
      },
      update: {
        displayName: pricing.displayName,
        active: true,
        promptMicrocreditsPerMillion: creditsToMicrocredits(
          pricing.promptCreditsPerMillion
        ),
        completionMicrocreditsPerMillion: creditsToMicrocredits(
          pricing.completionCreditsPerMillion
        ),
        cacheWriteMicrocreditsPerMillion: creditsToMicrocredits(
          pricing.cacheWriteCreditsPerMillion ?? 0
        ),
        cacheReadMicrocreditsPerMillion: creditsToMicrocredits(
          pricing.cacheReadCreditsPerMillion ?? 0
        ),
        minimumChargeMicrocredits: creditsToMicrocredits(
          pricing.minimumChargeCredits ?? 0
        ),
        metadata: pricing.metadata ?? Prisma.DbNull,
      },
      create: {
        provider: pricing.provider,
        model: pricing.model,
        displayName: pricing.displayName,
        active: true,
        promptMicrocreditsPerMillion: creditsToMicrocredits(
          pricing.promptCreditsPerMillion
        ),
        completionMicrocreditsPerMillion: creditsToMicrocredits(
          pricing.completionCreditsPerMillion
        ),
        cacheWriteMicrocreditsPerMillion: creditsToMicrocredits(
          pricing.cacheWriteCreditsPerMillion ?? 0
        ),
        cacheReadMicrocreditsPerMillion: creditsToMicrocredits(
          pricing.cacheReadCreditsPerMillion ?? 0
        ),
        minimumChargeMicrocredits: creditsToMicrocredits(
          pricing.minimumChargeCredits ?? 0
        ),
        metadata: pricing.metadata ?? Prisma.DbNull,
      },
    });
  }

  return aiModelPricingSeedData.length;
}

async function runStandalone() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed AI model pricing");
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const seededCount = await seedAiModelPricing(prisma);
    console.log(`Seeded ${seededCount} AI pricing rules.`);
  } finally {
    await prisma.$disconnect();
  }
}

const isStandaloneExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (isStandaloneExecution) {
  runStandalone().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
