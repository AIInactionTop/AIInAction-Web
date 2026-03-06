import type { AchievementRarity } from "@prisma/client";
import { prisma } from "./prisma";

export type AchievementTrigger =
  | "challenge_complete"
  | "challenge_publish"
  | "like_received"
  | "fork_received"
  | "project_share"
  | "comment_create";

export type AchievementDefinition = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  rarity: AchievementRarity;
};

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Completion achievements
  {
    slug: "first-step",
    name: "第一步",
    description: "完成第一个挑战",
    icon: "🎯",
    xpReward: 10,
    rarity: "COMMON",
  },
  {
    slug: "ten-complete",
    name: "十全十美",
    description: "完成 10 个挑战",
    icon: "🔟",
    xpReward: 50,
    rarity: "RARE",
  },
  {
    slug: "hundred-complete",
    name: "百炼成钢",
    description: "完成 100 个挑战",
    icon: "💯",
    xpReward: 200,
    rarity: "LEGENDARY",
  },
  {
    slug: "all-difficulties",
    name: "全能 AI",
    description: "完成全部 4 个难度各 1 个",
    icon: "🧠",
    xpReward: 100,
    rarity: "EPIC",
  },
  // Difficulty achievements
  {
    slug: "green-belt",
    name: "绿带",
    description: "完成 5 个 BEGINNER 挑战",
    icon: "🟢",
    xpReward: 20,
    rarity: "COMMON",
  },
  {
    slug: "blue-belt",
    name: "蓝带",
    description: "完成 5 个 INTERMEDIATE 挑战",
    icon: "🔵",
    xpReward: 30,
    rarity: "RARE",
  },
  {
    slug: "red-belt",
    name: "红带",
    description: "完成 5 个 ADVANCED 挑战",
    icon: "🔴",
    xpReward: 50,
    rarity: "EPIC",
  },
  {
    slug: "black-belt",
    name: "黑带",
    description: "完成 1 个 EXPERT 挑战",
    icon: "⚫",
    xpReward: 50,
    rarity: "EPIC",
  },
  // Streak achievements
  {
    slug: "streak-3",
    name: "三日不息",
    description: "连续 3 天完成挑战",
    icon: "🔥",
    xpReward: 15,
    rarity: "COMMON",
  },
  {
    slug: "streak-7",
    name: "周更达人",
    description: "连续 7 天完成挑战",
    icon: "🔥🔥",
    xpReward: 50,
    rarity: "RARE",
  },
  {
    slug: "streak-30",
    name: "月不停歇",
    description: "连续 30 天完成挑战",
    icon: "🔥🔥🔥",
    xpReward: 200,
    rarity: "LEGENDARY",
  },
  // Social achievements
  {
    slug: "creator",
    name: "创作者",
    description: "发布第 1 个挑战",
    icon: "✍️",
    xpReward: 20,
    rarity: "COMMON",
  },
  {
    slug: "popular",
    name: "受欢迎",
    description: "发布的挑战获得 10 个赞",
    icon: "🌟",
    xpReward: 50,
    rarity: "RARE",
  },
  {
    slug: "influencer",
    name: "影响力",
    description: "发布的挑战被 Fork 5 次",
    icon: "🤝",
    xpReward: 50,
    rarity: "RARE",
  },
  // Showcase achievements
  {
    slug: "showcase-star",
    name: "展示之星",
    description: "分享第 1 个项目到展示区",
    icon: "🌟",
    xpReward: 15,
    rarity: "COMMON",
  },
  {
    slug: "showcase-veteran",
    name: "展示达人",
    description: "分享 5 个项目到展示区",
    icon: "💎",
    xpReward: 50,
    rarity: "RARE",
  },
  // Comment achievements
  {
    slug: "first-comment",
    name: "畅所欲言",
    description: "发表第 1 条评论",
    icon: "💬",
    xpReward: 5,
    rarity: "COMMON",
  },
  {
    slug: "commentator",
    name: "评论达人",
    description: "发表 20 条评论",
    icon: "🗣️",
    xpReward: 30,
    rarity: "RARE",
  },
  // Path achievements
  {
    slug: "path-pioneer",
    name: "路径先驱",
    description: "完成第一条学习路径",
    icon: "🗺️",
    xpReward: 100,
    rarity: "EPIC",
  },
  {
    slug: "path-master",
    name: "全路径大师",
    description: "完成所有学习路径",
    icon: "🏆",
    xpReward: 500,
    rarity: "LEGENDARY",
  },
];

type UnlockedAchievement = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  rarity: AchievementRarity;
};

export async function checkAndAwardAchievements(
  userId: string,
  trigger: AchievementTrigger
): Promise<UnlockedAchievement[]> {
  const newlyUnlocked: UnlockedAchievement[] = [];

  // Get existing achievements for this user
  const existing = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievement: { select: { slug: true } } },
  });
  const unlockedSlugs = new Set(existing.map((e) => e.achievement.slug));

  // Determine which achievements to check based on trigger
  const checksToRun = getChecksForTrigger(trigger);

  for (const check of checksToRun) {
    if (unlockedSlugs.has(check.slug)) continue;

    const earned = await check.condition(userId);
    if (!earned) continue;

    // Find the achievement in DB
    const achievement = await prisma.achievement.findUnique({
      where: { slug: check.slug },
    });
    if (!achievement) continue;

    // Idempotent: use upsert to prevent duplicates
    await prisma.userAchievement.upsert({
      where: {
        userId_achievementId: { userId, achievementId: achievement.id },
      },
      update: {},
      create: { userId, achievementId: achievement.id },
    });

    newlyUnlocked.push({
      slug: achievement.slug,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      xpReward: achievement.xpReward,
      rarity: achievement.rarity,
    });
  }

  return newlyUnlocked;
}

type AchievementCheck = {
  slug: string;
  condition: (userId: string) => Promise<boolean>;
};

function getChecksForTrigger(trigger: AchievementTrigger): AchievementCheck[] {
  switch (trigger) {
    case "challenge_complete":
      return [
        ...completionChecks,
        ...difficultyChecks,
        ...streakChecks,
        ...pathChecks,
      ];
    case "challenge_publish":
      return [creatorCheck];
    case "like_received":
      return [popularCheck];
    case "fork_received":
      return [influencerCheck];
    case "project_share":
      return [showcaseStarCheck, showcaseVeteranCheck];
    case "comment_create":
      return [firstCommentCheck, commentatorCheck];
  }
}

// --- Completion checks ---
const completionChecks: AchievementCheck[] = [
  {
    slug: "first-step",
    condition: async (userId) => {
      const count = await prisma.challengeCompletion.count({
        where: { userId, status: "COMPLETED" },
      });
      return count >= 1;
    },
  },
  {
    slug: "ten-complete",
    condition: async (userId) => {
      const count = await prisma.challengeCompletion.count({
        where: { userId, status: "COMPLETED" },
      });
      return count >= 10;
    },
  },
  {
    slug: "hundred-complete",
    condition: async (userId) => {
      const count = await prisma.challengeCompletion.count({
        where: { userId, status: "COMPLETED" },
      });
      return count >= 100;
    },
  },
  {
    slug: "all-difficulties",
    condition: async (userId) => {
      const completions = await prisma.challengeCompletion.findMany({
        where: { userId, status: "COMPLETED" },
        select: { challenge: { select: { difficulty: true } } },
      });
      const difficulties = new Set(
        completions.map((c) => c.challenge.difficulty)
      );
      return (
        difficulties.has("BEGINNER") &&
        difficulties.has("INTERMEDIATE") &&
        difficulties.has("ADVANCED") &&
        difficulties.has("EXPERT")
      );
    },
  },
];

// --- Difficulty checks ---
const difficultyChecks: AchievementCheck[] = [
  {
    slug: "green-belt",
    condition: async (userId) => {
      const count = await prisma.challengeCompletion.count({
        where: {
          userId,
          status: "COMPLETED",
          challenge: { difficulty: "BEGINNER" },
        },
      });
      return count >= 5;
    },
  },
  {
    slug: "blue-belt",
    condition: async (userId) => {
      const count = await prisma.challengeCompletion.count({
        where: {
          userId,
          status: "COMPLETED",
          challenge: { difficulty: "INTERMEDIATE" },
        },
      });
      return count >= 5;
    },
  },
  {
    slug: "red-belt",
    condition: async (userId) => {
      const count = await prisma.challengeCompletion.count({
        where: {
          userId,
          status: "COMPLETED",
          challenge: { difficulty: "ADVANCED" },
        },
      });
      return count >= 5;
    },
  },
  {
    slug: "black-belt",
    condition: async (userId) => {
      const count = await prisma.challengeCompletion.count({
        where: {
          userId,
          status: "COMPLETED",
          challenge: { difficulty: "EXPERT" },
        },
      });
      return count >= 1;
    },
  },
];

// --- Streak checks ---
const streakChecks: AchievementCheck[] = [
  {
    slug: "streak-3",
    condition: async (userId) => {
      const stats = await prisma.userStats.findUnique({ where: { userId } });
      return (stats?.longestStreak ?? 0) >= 3;
    },
  },
  {
    slug: "streak-7",
    condition: async (userId) => {
      const stats = await prisma.userStats.findUnique({ where: { userId } });
      return (stats?.longestStreak ?? 0) >= 7;
    },
  },
  {
    slug: "streak-30",
    condition: async (userId) => {
      const stats = await prisma.userStats.findUnique({ where: { userId } });
      return (stats?.longestStreak ?? 0) >= 30;
    },
  },
];

// --- Path checks ---
const pathChecks: AchievementCheck[] = [
  {
    slug: "path-pioneer",
    condition: async (userId) => {
      // Check if user completed all challenges in any learning path
      const paths = await prisma.learningPath.findMany({
        include: { challenges: { select: { id: true } } },
      });
      for (const path of paths) {
        if (path.challenges.length === 0) continue;
        const completedCount = await prisma.challengeCompletion.count({
          where: {
            userId,
            status: "COMPLETED",
            challengeId: { in: path.challenges.map((c) => c.id) },
          },
        });
        if (completedCount >= path.challenges.length) return true;
      }
      return false;
    },
  },
  {
    slug: "path-master",
    condition: async (userId) => {
      const paths = await prisma.learningPath.findMany({
        include: { challenges: { select: { id: true } } },
      });
      const pathsWithChallenges = paths.filter(
        (p) => p.challenges.length > 0
      );
      if (pathsWithChallenges.length === 0) return false;
      for (const path of pathsWithChallenges) {
        const completedCount = await prisma.challengeCompletion.count({
          where: {
            userId,
            status: "COMPLETED",
            challengeId: { in: path.challenges.map((c) => c.id) },
          },
        });
        if (completedCount < path.challenges.length) return false;
      }
      return true;
    },
  },
];

// --- Social checks ---
const creatorCheck: AchievementCheck = {
  slug: "creator",
  condition: async (userId) => {
    const count = await prisma.challenge.count({
      where: { authorId: userId, isOfficial: false },
    });
    return count >= 1;
  },
};

const popularCheck: AchievementCheck = {
  slug: "popular",
  condition: async (userId) => {
    const totalLikes = await prisma.challengeLike.count({
      where: { challenge: { authorId: userId } },
    });
    return totalLikes >= 10;
  },
};

const influencerCheck: AchievementCheck = {
  slug: "influencer",
  condition: async (userId) => {
    const totalForks = await prisma.challenge.count({
      where: { forkedFrom: { authorId: userId } },
    });
    return totalForks >= 5;
  },
};

// --- Showcase checks ---
const showcaseStarCheck: AchievementCheck = {
  slug: "showcase-star",
  condition: async (userId) => {
    const count = await prisma.sharedProject.count({ where: { userId } });
    return count >= 1;
  },
};

const showcaseVeteranCheck: AchievementCheck = {
  slug: "showcase-veteran",
  condition: async (userId) => {
    const count = await prisma.sharedProject.count({ where: { userId } });
    return count >= 5;
  },
};

// --- Comment checks ---
const firstCommentCheck: AchievementCheck = {
  slug: "first-comment",
  condition: async (userId) => {
    const count = await prisma.challengeComment.count({ where: { userId } });
    return count >= 1;
  },
};

const commentatorCheck: AchievementCheck = {
  slug: "commentator",
  condition: async (userId) => {
    const count = await prisma.challengeComment.count({ where: { userId } });
    return count >= 20;
  },
};
