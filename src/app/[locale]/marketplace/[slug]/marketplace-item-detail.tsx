"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import {
  Star, ExternalLink, ShoppingCart, Check, Trash2, Pencil,
  Sparkles, FileCode, Package, Wrench, ArrowLeft, Loader2,
  CalendarDays, CreditCard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { purchaseMarketplaceItem, submitMarketplaceReview, deleteMarketplaceItem } from "@/actions/marketplace";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null };
};

type ItemDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  longDescription: string | null;
  type: string;
  status: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  demoUrl: string | null;
  sourceUrl: string | null;
  tags: string[];
  features: string[];
  viewsCount: number;
  salesCount: number;
  avgRating: number;
  reviewsCount: number;
  createdAt: string;
  hasPurchased: boolean;
  purchaseInfo: { price: number; currency: string; createdAt: string } | null;
  userReview: { id: string; rating: number; comment: string | null } | null;
  seller: { id: string; name: string | null; image: string | null; bio: string | null; stripeConnectAccountId: string | null };
  reviews: Review[];
};

const typeIcons: Record<string, typeof Sparkles> = {
  SKILL: Sparkles,
  TEMPLATE: FileCode,
  PRODUCT: Package,
  SERVICE: Wrench,
};

const typeColors: Record<string, string> = {
  SKILL: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  TEMPLATE: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  PRODUCT: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  SERVICE: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

function formatPrice(price: number, currency: string) {
  if (price === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price / 100);
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

export function MarketplaceItemDetail({
  item,
  currentUserId,
}: {
  item: ItemDetail;
  currentUserId: string | null;
}) {
  const t = useTranslations("marketplace");
  const locale = useLocale();
  const router = useRouter();
  const { data: session } = useSession();
  const [isPurchasing, startPurchase] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [reviewRating, setReviewRating] = useState(item.userReview?.rating || 0);
  const [reviewComment, setReviewComment] = useState(item.userReview?.comment || "");
  const [isReviewing, startReview] = useTransition();

  const isOwner = currentUserId === item.seller.id;
  const TypeIcon = typeIcons[item.type] || Package;

  const handlePurchase = () => {
    if (item.price === 0) {
      startPurchase(async () => {
        await purchaseMarketplaceItem(item.id);
        router.refresh();
      });
      return;
    }

    startPurchase(async () => {
      try {
        const response = await fetch("/api/marketplace/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: item.id,
            successUrl: `${window.location.pathname}?checkout=success`,
            cancelUrl: `${window.location.pathname}?checkout=cancelled`,
          }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.data?.url) {
          throw new Error(payload?.error?.message || "Failed to create checkout");
        }

        window.location.href = payload.data.url;
      } catch (err) {
        alert(err instanceof Error ? err.message : "Checkout failed");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(t("deleteConfirm"))) return;
    startDelete(async () => {
      await deleteMarketplaceItem(item.id);
    });
  };

  const handleReviewSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("itemId", item.id);
    formData.set("rating", String(reviewRating));
    formData.set("comment", reviewComment);
    startReview(async () => {
      await submitMarketplaceReview(formData);
      router.refresh();
    });
  };

  const checkoutStatus = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("checkout")
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      {checkoutStatus === "success" && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <Check className="h-4 w-4 shrink-0" />
          Payment completed. Thank you for your purchase!
        </div>
      )}
      {checkoutStatus === "cancelled" && (
        <div className="mb-4 rounded-lg border border-border/60 bg-card/50 px-4 py-3 text-sm text-muted-foreground">
          Checkout was cancelled.
        </div>
      )}

      {/* Back link */}
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToMarketplace")}
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {item.imageUrl && (
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted">
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className={`gap-1 ${typeColors[item.type] || ""}`}>
                <TypeIcon className="h-3.5 w-3.5" />
                {t(`type${item.type.charAt(0)}${item.type.slice(1).toLowerCase()}`)}
              </Badge>
              {item.avgRating > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <StarRating rating={Math.round(item.avgRating)} size={14} />
                  <span className="text-muted-foreground">
                    ({item.avgRating.toFixed(1)} · {t("reviewCount", { count: item.reviewsCount })})
                  </span>
                </div>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{item.title}</h1>
            <p className="mt-3 text-lg text-muted-foreground">{item.description}</p>
          </div>

          {item.longDescription && (
            <div className="prose dark:prose-invert max-w-none">
              <h2 className="text-xl font-semibold">{t("details")}</h2>
              <p className="whitespace-pre-wrap">{item.longDescription}</p>
            </div>
          )}

          {item.features.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">{t("features")}</h2>
              <ul className="space-y-2">
                {item.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          )}

          <Separator />

          {/* Reviews */}
          <div>
            <h2 className="text-xl font-semibold mb-4">{t("reviews")}</h2>

            {(item.hasPurchased || item.price === 0) && !isOwner && session?.user && (
              <form onSubmit={handleReviewSubmit} className="mb-6 rounded-lg border p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">{t("yourRating")}</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-6 w-6 ${star <= reviewRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("reviewComment")}</label>
                  <textarea
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder={t("reviewPlaceholder")}
                  />
                </div>
                <Button type="submit" size="sm" disabled={reviewRating === 0 || isReviewing}>
                  {isReviewing ? t("submitting") : item.userReview ? t("updateReview") : t("submitReview")}
                </Button>
              </form>
            )}

            {item.reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noReviews")}</p>
            ) : (
              <div className="space-y-4">
                {item.reviews.map((review) => (
                  <div key={review.id} className="rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={review.user.image || ""} />
                        <AvatarFallback>{review.user.name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{review.user.name}</p>
                        <StarRating rating={review.rating} size={12} />
                      </div>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-xl border p-6 space-y-4">
              <div className="text-3xl font-bold">{formatPrice(item.price, item.currency)}</div>

              {item.salesCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("salesCount", { count: item.salesCount })}
                </p>
              )}

              {isOwner ? (
                <div className="space-y-2">
                  <Button className="w-full gap-2" variant="outline" asChild>
                    <Link href={`/marketplace/${item.slug}/edit`}>
                      <Pencil className="h-4 w-4" />
                      {t("editItem")}
                    </Link>
                  </Button>
                  <Button
                    className="w-full gap-2"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? t("deleting") : t("deleteItem")}
                  </Button>
                </div>
              ) : item.hasPurchased ? (
                item.purchaseInfo ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      <Check className="h-4 w-4 shrink-0" />
                      {t("purchased")}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {t("purchasedOn", { date: new Date(item.purchaseInfo.createdAt).toLocaleDateString(locale) })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("pricePaid")}</span>
                        <span className="font-medium">{formatPrice(item.purchaseInfo.price, item.purchaseInfo.currency)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("paymentMethod")}</span>
                        <span className="flex items-center gap-1.5 font-medium">
                          <CreditCard className="h-3.5 w-3.5" />
                          {item.purchaseInfo.price > 0 ? t("paidViaStripe") : t("freeAcquired")}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button className="w-full gap-2" disabled>
                    <Check className="h-4 w-4" />
                    {t("purchased")}
                  </Button>
                )
              ) : !item.seller.stripeConnectAccountId && item.price > 0 ? (
                <Button className="w-full gap-2" disabled>
                  <ShoppingCart className="h-4 w-4" />
                  {t("sellerNotConnected")}
                </Button>
              ) : (
                <Button
                  className="w-full gap-2"
                  onClick={handlePurchase}
                  disabled={isPurchasing || !session?.user}
                >
                  {isPurchasing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="h-4 w-4" />
                  )}
                  {isPurchasing ? t("purchasing") : item.price === 0 ? t("getFree") : t("buyNow")}
                </Button>
              )}

              {(item.demoUrl || item.sourceUrl) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    {item.demoUrl && (
                      <a
                        href={item.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {t("viewDemo")}
                      </a>
                    )}
                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {t("viewSource")}
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Seller info */}
            <div className="rounded-xl border p-6 space-y-3">
              <h3 className="text-sm font-semibold">{t("seller")}</h3>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={item.seller.image || ""} />
                  <AvatarFallback>{item.seller.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <Link
                    href={`/profile/${item.seller.id}` as never}
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    {item.seller.name}
                  </Link>
                  {item.seller.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.seller.bio}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
