import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getJobBySlug } from "@/lib/jobs";
import { updateJob } from "@/actions/jobs";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { JobForm } from "../../job-form";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function EditJobPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);

  const job = await getJobBySlug(slug);
  if (!job) notFound();
  if (job.authorId !== session.user.id) redirect(`/${locale}/jobs/${slug}`);

  const t = await getTranslations("jobs");

  const updateWithId = async (formData: FormData) => {
    "use server";
    await updateJob(job.id, formData);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">{t("editTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("editSubtitle")}</p>

      <div className="mt-8">
        <JobForm
          action={updateWithId}
          defaultValues={job}
          submitLabel={t("updateButton")}
          locale={locale}
        />
      </div>
    </div>
  );
}
