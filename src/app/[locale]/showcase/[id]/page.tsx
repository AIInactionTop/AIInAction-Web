import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getProjectById, hasUserLikedProject } from "@/actions/projects";
import { ShowcaseDetailClient } from "./detail-client";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const project = await getProjectById(id);
  if (!project) return { title: "Not Found" };
  return {
    title: project.title,
    description: project.description.replace(/<[^>]*>/g, "").slice(0, 160),
  };
}

export default async function ShowcaseDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const project = await getProjectById(id);
  if (!project) notFound();

  const liked = await hasUserLikedProject(project.id);
  const t = await getTranslations("showcase");

  return (
    <ShowcaseDetailClient
      project={JSON.parse(JSON.stringify(project))}
      initialLiked={liked}
    />
  );
}
