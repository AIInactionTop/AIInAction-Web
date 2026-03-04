import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { getProjectById } from "@/actions/projects";
import { SubmitProjectForm } from "../../submit-form";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function EditProjectPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await getProjectById(id);
  if (!project) notFound();
  if (project.userId !== session.user.id) redirect(`/showcase/${id}`);

  const t = await getTranslations("showcase");

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <Link
        href={`/showcase/${id}`}
        className="mb-8 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("backToShowcase")}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{t("editPageTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("editPageSubtitle")}
      </p>
      <div className="mt-8">
        <SubmitProjectForm
          projectId={project.id}
          defaultValues={{
            title: project.title,
            description: project.description,
            githubUrl: project.githubUrl,
            demoUrl: project.demoUrl,
            imageUrl: project.imageUrl,
            tags: project.tags,
          }}
          challengeSlug={project.challenge?.slug}
          challengeName={project.challenge?.title}
        />
      </div>
    </div>
  );
}
