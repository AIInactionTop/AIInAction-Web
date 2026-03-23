import { prisma } from "./prisma";
import type { MarketplaceItemType, MarketplaceItemStatus, Prisma } from "@prisma/client";

export type MarketplaceFilters = {
  type?: MarketplaceItemType;
  types?: MarketplaceItemType[];
  search?: string;
  tag?: string;
  sellerId?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: MarketplaceItemStatus;
  page?: number;
  pageSize?: number;
  sortBy?: "newest" | "price_asc" | "price_desc" | "rating" | "sales";
};

export async function getMarketplaceItems(filters: MarketplaceFilters = {}) {
  const {
    type,
    types,
    search,
    tag,
    sellerId,
    minPrice,
    maxPrice,
    status = "PUBLISHED",
    page = 1,
    pageSize = 24,
    sortBy = "newest",
  } = filters;

  const where: Prisma.MarketplaceItemWhereInput = {};

  if (status) {
    where.status = status;
  }

  const typeList = types?.length ? types : type ? [type] : [];
  if (typeList.length === 1) {
    where.type = typeList[0];
  } else if (typeList.length > 1) {
    where.type = { in: typeList };
  }

  if (sellerId) {
    where.sellerId = sellerId;
  }

  if (tag) {
    where.tags = { has: tag };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  let orderBy: Prisma.MarketplaceItemOrderByWithRelationInput[];
  switch (sortBy) {
    case "price_asc":
      orderBy = [{ price: "asc" }, { createdAt: "desc" }];
      break;
    case "price_desc":
      orderBy = [{ price: "desc" }, { createdAt: "desc" }];
      break;
    case "rating":
      orderBy = [{ avgRating: "desc" }, { reviewsCount: "desc" }, { createdAt: "desc" }];
      break;
    case "sales":
      orderBy = [{ salesCount: "desc" }, { createdAt: "desc" }];
      break;
    case "newest":
    default:
      orderBy = [{ createdAt: "desc" }];
      break;
  }

  const [items, total] = await Promise.all([
    prisma.marketplaceItem.findMany({
      where,
      include: {
        seller: { select: { id: true, name: true, image: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.marketplaceItem.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getMarketplaceItemBySlug(slug: string, userId?: string) {
  const item = await prisma.marketplaceItem.findUnique({
    where: { slug },
    include: {
      seller: { select: { id: true, name: true, image: true, bio: true, stripeConnectAccountId: true } },
      reviews: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!item) return null;

  let hasPurchased = false;
  let purchaseInfo: { price: number; currency: string; createdAt: Date } | null = null;
  let userReview = null;
  if (userId) {
    const [purchase, review] = await Promise.all([
      prisma.marketplacePurchase.findUnique({
        where: { userId_itemId: { userId, itemId: item.id } },
        select: { price: true, currency: true, createdAt: true },
      }),
      prisma.marketplaceReview.findUnique({
        where: { userId_itemId: { userId, itemId: item.id } },
      }),
    ]);
    hasPurchased = !!purchase;
    purchaseInfo = purchase;
    userReview = review;
  }

  return { ...item, hasPurchased, purchaseInfo, userReview };
}

export async function getMarketplaceStats() {
  const [totalItems, totalSellers, totalSales] = await Promise.all([
    prisma.marketplaceItem.count({ where: { status: "PUBLISHED" } }),
    prisma.marketplaceItem
      .findMany({ where: { status: "PUBLISHED" }, select: { sellerId: true }, distinct: ["sellerId"] })
      .then((r) => r.length),
    prisma.marketplacePurchase.count(),
  ]);

  return { totalItems, totalSellers, totalSales };
}

export async function getUserMarketplaceItems(userId: string) {
  return prisma.marketplaceItem.findMany({
    where: { sellerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { purchases: true, reviews: true } },
    },
  });
}

export async function getUserPurchases(userId: string, page = 1, pageSize = 20) {
  const where = { userId };
  const [purchases, total] = await Promise.all([
    prisma.marketplacePurchase.findMany({
      where,
      include: {
        item: {
          select: {
            title: true,
            slug: true,
            imageUrl: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.marketplacePurchase.count({ where }),
  ]);

  return { purchases, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getUserPurchaseStats(userId: string) {
  const [currencyTotals, lastPurchase] = await Promise.all([
    prisma.marketplacePurchase.groupBy({
      by: ["currency"],
      where: { userId },
      _sum: { price: true },
      _count: true,
    }),
    prisma.marketplacePurchase.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const totalCount = currencyTotals.reduce((sum, g) => sum + g._count, 0);

  return {
    totals: currencyTotals.map((g) => ({
      currency: g.currency,
      amount: g._sum.price || 0,
      count: g._count,
    })),
    totalCount,
    lastPurchaseDate: lastPurchase?.createdAt || null,
  };
}
