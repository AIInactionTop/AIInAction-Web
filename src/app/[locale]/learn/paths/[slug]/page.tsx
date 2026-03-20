import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPathBySlug, getChallengesByPath } from "@/lib/challenges";
import { PathDetail } from "./path-detail";
import { setRequestLocale, getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const path = await getPathBySlug(slug);
  if (!path) return { title: "Path Not Found" };
  const tPath = await getTranslations({ locale, namespace: "pathContent" });
  return {
    title: tPath.has(`${slug}.title`) ? tPath(`${slug}.title`) : path.title,
    description: tPath.has(`${slug}.description`) ? tPath(`${slug}.description`) : path.description,
  };
}

export default async function PathDetailPage({ params }: Props) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const path = await getPathBySlug(slug);
  if (!path) notFound();

  const challenges = await getChallengesByPath(slug, locale);

  return (
    <PathDetail
      path={JSON.parse(JSON.stringify(path))}
      challenges={JSON.parse(JSON.stringify(challenges))}
    />
  );
}
