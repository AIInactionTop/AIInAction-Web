"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function generateUniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let suffix = 0;
  while (await prisma.marketplaceItem.findUnique({ where: { slug } })) {
    suffix++;
    slug = `${slugify(base)}-${suffix}`;
  }
  return slug;
}

export async function createMarketplaceItem(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const longDescription = (formData.get("longDescription") as string) || null;
  const type = formData.get("type") as "SKILL" | "TEMPLATE" | "PRODUCT" | "SERVICE";
  const priceStr = formData.get("price") as string;
  const currency = (formData.get("currency") as string) || "usd";
  const imageUrl = (formData.get("imageUrl") as string) || null;
  const demoUrl = (formData.get("demoUrl") as string) || null;
  const sourceUrl = (formData.get("sourceUrl") as string) || null;
  const tagsRaw = formData.get("tags") as string;
  const featuresRaw = formData.getAll("features") as string[];

  const price = Math.round(parseFloat(priceStr || "0") * 100);
  const slug = await generateUniqueSlug(title);
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const features = featuresRaw.filter(Boolean);

  const item = await prisma.marketplaceItem.create({
    data: {
      slug,
      title,
      description,
      longDescription,
      type,
      price,
      currency,
      imageUrl,
      demoUrl,
      sourceUrl,
      tags,
      features,
      sellerId: session.user.id,
      status: "PUBLISHED",
    },
  });

  revalidatePath("/marketplace");
  redirect(`/marketplace/${item.slug}`);
}

export async function updateMarketplaceItem(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const itemId = formData.get("itemId") as string;
  const item = await prisma.marketplaceItem.findUnique({ where: { id: itemId } });
  if (!item || item.sellerId !== session.user.id) throw new Error("Forbidden");

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const longDescription = (formData.get("longDescription") as string) || null;
  const type = formData.get("type") as "SKILL" | "TEMPLATE" | "PRODUCT" | "SERVICE";
  const priceStr = formData.get("price") as string;
  const currency = (formData.get("currency") as string) || "usd";
  const imageUrl = (formData.get("imageUrl") as string) || null;
  const demoUrl = (formData.get("demoUrl") as string) || null;
  const sourceUrl = (formData.get("sourceUrl") as string) || null;
  const tagsRaw = formData.get("tags") as string;
  const featuresRaw = formData.getAll("features") as string[];

  const price = Math.round(parseFloat(priceStr || "0") * 100);
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const features = featuresRaw.filter(Boolean);

  const updated = await prisma.marketplaceItem.update({
    where: { id: itemId },
    data: {
      title,
      description,
      longDescription,
      type,
      price,
      currency,
      imageUrl,
      demoUrl,
      sourceUrl,
      tags,
      features,
    },
  });

  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${updated.slug}`);
  redirect(`/marketplace/${updated.slug}`);
}

export async function deleteMarketplaceItem(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const item = await prisma.marketplaceItem.findUnique({ where: { id: itemId } });
  if (!item || item.sellerId !== session.user.id) throw new Error("Forbidden");

  await prisma.marketplaceItem.delete({ where: { id: itemId } });

  revalidatePath("/marketplace");
  redirect("/marketplace");
}

export async function purchaseMarketplaceItem(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const item = await prisma.marketplaceItem.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Item not found");
  if (item.sellerId === session.user.id) throw new Error("Cannot purchase own item");

  const existing = await prisma.marketplacePurchase.findUnique({
    where: { userId_itemId: { userId: session.user.id, itemId } },
  });
  if (existing) throw new Error("Already purchased");

  await prisma.$transaction([
    prisma.marketplacePurchase.create({
      data: {
        userId: session.user.id,
        itemId,
        price: item.price,
        currency: item.currency,
      },
    }),
    prisma.marketplaceItem.update({
      where: { id: itemId },
      data: { salesCount: { increment: 1 } },
    }),
  ]);

  revalidatePath(`/marketplace/${item.slug}`);
  return { success: true };
}

export async function submitMarketplaceReview(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const itemId = formData.get("itemId") as string;
  const rating = parseInt(formData.get("rating") as string, 10);
  const comment = (formData.get("comment") as string) || null;

  if (rating < 1 || rating > 5) throw new Error("Rating must be 1-5");

  const item = await prisma.marketplaceItem.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Item not found");

  const purchased = await prisma.marketplacePurchase.findUnique({
    where: { userId_itemId: { userId: session.user.id, itemId } },
  });
  if (!purchased && item.price > 0) throw new Error("Must purchase before reviewing");

  await prisma.marketplaceReview.upsert({
    where: { userId_itemId: { userId: session.user.id, itemId } },
    create: { userId: session.user.id, itemId, rating, comment },
    update: { rating, comment },
  });

  const stats = await prisma.marketplaceReview.aggregate({
    where: { itemId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.marketplaceItem.update({
    where: { id: itemId },
    data: {
      avgRating: stats._avg.rating || 0,
      reviewsCount: stats._count.rating,
    },
  });

  revalidatePath(`/marketplace/${item.slug}`);
  return { success: true };
}
