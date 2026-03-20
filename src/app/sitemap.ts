import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { locales, defaultLocale } from "@/i18n/config";

const baseUrl = "https://aiinaction.top";

function localizedEntry(
  path: string,
  options: {
    lastModified: Date;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }
): MetadataRoute.Sitemap[number] {
  const alternates: Record<string, string> = {};
  for (const locale of locales) {
    alternates[locale] =
      locale === defaultLocale
        ? `${baseUrl}${path}`
        : `${baseUrl}/${locale}${path}`;
  }

  return {
    url: `${baseUrl}${path}`,
    lastModified: options.lastModified,
    changeFrequency: options.changeFrequency,
    priority: options.priority,
    alternates: { languages: alternates },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [allChallenges, allPaths] = await Promise.all([
    prisma.challenge.findMany({ select: { slug: true } }),
    prisma.learningPath.findMany({ select: { slug: true } }),
  ]);

  const staticPages = [
    localizedEntry("", {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    }),
    localizedEntry("/learn", {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    }),
    localizedEntry("/learn/challenges", {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    }),
    localizedEntry("/learn/paths", {
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    }),
    localizedEntry("/learn/activities", {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
    localizedEntry("/showcase", {
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    }),
  ];

  const challenges = allChallenges.map((c) =>
    localizedEntry(`/learn/challenges/${c.slug}`, {
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    })
  );

  const paths = allPaths.map((p) =>
    localizedEntry(`/learn/paths/${p.slug}`, {
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    })
  );

  return [...staticPages, ...paths, ...challenges];
}
