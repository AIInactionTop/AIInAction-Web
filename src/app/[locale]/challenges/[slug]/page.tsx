import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Clock,
  Target,
  Lightbulb,
  BookOpen,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  Shield,
  GitFork,
  MessageCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getChallengeBySlug,
  getChallengesByPath,
  getChallengeComments,
  difficultyConfig,
  hasUserLiked,
  hasUserCompleted,
  hasUserRegistered,
  getPublicReflections,
  getProjectsByChallenge,
} from "@/lib/challenges";
import { auth } from "@/lib/auth";
import { ChallengeActions } from "./challenge-actions";
import { CommentSection } from "./comment-section";
import { ReflectionsSection } from "./reflections-section";
import { ShowcaseSection } from "./showcase-section";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const challenge = await getChallengeBySlug(slug, locale);
  if (!challenge) {
    const t = await getTranslations({ locale, namespace: "metadata" });
    return { title: t("challengeNotFound") };
  }
  return {
    title: challenge.title,
    description: challenge.description,
  };
}

export default async function ChallengeDetailPage({ params }: Props) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const challenge = await getChallengeBySlug(slug, locale);
  if (!challenge) notFound();

  const diff = difficultyConfig[challenge.difficulty];

  const session = await auth();
  const userId = session?.user?.id;

  const t = await getTranslations("challenge");
  const tc = await getTranslations("common");
  const tnav = await getTranslations("nav");
  const tCat = await getTranslations("categories");
  const td = await getTranslations("difficulty");

  const title = challenge.title;
  const description = challenge.description;
  const objectives = challenge.objectives;
  const hints = challenge.hints;
  const categoryName = challenge.category && tCat.has(`${challenge.category.slug}.name`)
    ? tCat(`${challenge.category.slug}.name`) : challenge.category?.name;
  const diffLabel = td.has(challenge.difficulty) ? td(challenge.difficulty) : diff.label;

  const [pathChallenges, { comments, total: commentTotal }, liked, completed, registered, reflections, projects] =
    await Promise.all([
      challenge.path ? getChallengesByPath(challenge.path.slug, locale) : Promise.resolve([]),
      getChallengeComments(challenge.id),
      userId ? hasUserLiked(userId, challenge.id) : Promise.resolve(false),
      userId ? hasUserCompleted(userId, challenge.id) : Promise.resolve(false),
      userId ? hasUserRegistered(userId, challenge.id) : Promise.resolve(false),
      getPublicReflections(challenge.id),
      getProjectsByChallenge(challenge.id),
    ]);

  const currentIndex = pathChallenges.findIndex((c) => c.slug === slug);
  const prevChallenge =
    currentIndex > 0 ? pathChallenges[currentIndex - 1] : null;
  const nextChallenge =
    currentIndex < pathChallenges.length - 1
      ? pathChallenges[currentIndex + 1]
      : null;

  const isAuthor = userId === challenge.authorId;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/challenges"
          className="flex items-center gap-1 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {tnav("challenges")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{title}</span>
      </div>

      {/* Header */}
      <div className="mt-8">
        <div className="flex flex-wrap items-center gap-3">
          {challenge.isOfficial ? (
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" />
              {tc("official")}
            </Badge>
          ) : challenge.author ? (
            <div className="flex items-center gap-2">
              {challenge.author.image && (
                <Image
                  src={challenge.author.image}
                  alt={challenge.author.name || ""}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              )}
              <span className="text-sm text-muted-foreground">
                {t("by")}{" "}
                <Link
                  href={`/profile/${challenge.author.id}`}
                  className="text-foreground hover:underline"
                >
                  {challenge.author.name}
                </Link>
              </span>
            </div>
          ) : null}
          <Badge variant="outline" className={diff.className}>
            {diffLabel}
          </Badge>
          {challenge.category && (
            <Badge variant="secondary">{categoryName}</Badge>
          )}
          {challenge.estimatedTime && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {challenge.estimatedTime}
            </div>
          )}
        </div>

        {/* Forked from */}
        {/* {challenge.forkedFrom && (
          <p className="mt-2 text-sm text-muted-foreground">
            <GitFork className="inline h-3.5 w-3.5 mr-1" />
            {t("forkedFrom")}{" "}
            <Link
              href={`/challenges/${challenge.forkedFrom.slug}`}
              className="text-primary hover:underline"
            >
              {challenge.forkedFrom.title}
            </Link>
          </p>
        )} */}

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          {description}
        </p>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span>{tc("likes", { count: challenge.likesCount })}</span>
          {/* <span className="flex items-center gap-1">
            <GitFork className="h-3.5 w-3.5" />
            {tc("forks", { count: challenge._count.forks })}
          </span> */}
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {tc("comments", { count: challenge._count.comments })}
          </span>
        </div>
      </div>

      {/* Tags */}
      <div className="mt-6 flex flex-wrap gap-2">
        {challenge.tags.map((ct) => (
          <Badge key={ct.tag.name} variant="outline" className="text-xs">
            {ct.tag.name}
          </Badge>
        ))}
      </div>

      <ChallengeActions
        challengeId={challenge.id}
        slug={challenge.slug}
        likesCount={challenge.likesCount}
        liked={liked}
        completed={completed}
        registered={registered}
        isAuthor={isAuthor}
      />

      <Separator className="my-8" />

      {/* Objectives */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Target className="h-5 w-5 text-primary" />
          {t("objectives")}
        </h2>
        <ul className="mt-4 space-y-3">
          {objectives.map((obj, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm leading-relaxed">{obj}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Hints */}
      {hints.length > 0 && (
        <>
          <Separator className="my-8" />
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              {t("hints")}
            </h2>
            <ul className="mt-4 space-y-3">
              {hints.map((hint, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-amber-500/10 bg-amber-500/5 px-4 py-3 text-sm leading-relaxed"
                >
                  {hint}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {/* Resources */}
      {challenge.resources.length > 0 && (
        <>
          <Separator className="my-8" />
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <BookOpen className="h-5 w-5 text-primary" />
              {t("resources")}
            </h2>
            <ul className="mt-4 space-y-2">
              {challenge.resources.map((url, i) => (
                <li key={i}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {/* Reflections */}
      {reflections.length > 0 && (
        <>
          <Separator className="my-8" />
          <ReflectionsSection
            reflections={JSON.parse(JSON.stringify(reflections))}
          />
        </>
      )}

      {/* Showcase Projects */}
      {projects.length > 0 && (
        <>
          <Separator className="my-8" />
          <ShowcaseSection
            projects={JSON.parse(JSON.stringify(projects))}
          />
        </>
      )}

      {/* Comments */}
      <Separator className="my-8" />
      <CommentSection
        challengeId={challenge.id}
        comments={JSON.parse(JSON.stringify(comments))}
        totalComments={commentTotal}
        currentUserId={userId || null}
      />

      {/* Navigation */}
      {pathChallenges.length > 0 && (
        <>
          <Separator className="my-8" />
          <div className="flex items-center justify-between">
            {prevChallenge ? (
              <Link href={`/challenges/${prevChallenge.slug}`}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {prevChallenge.title}
                </Button>
              </Link>
            ) : (
              <div />
            )}
            {nextChallenge ? (
              <Link href={`/challenges/${nextChallenge.slug}`}>
                <Button variant="ghost" size="sm" className="gap-2">
                  {nextChallenge.title}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </>
      )}
    </div>
  );
}
