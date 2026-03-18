import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { createJob } from "@/actions/jobs";
import { JobForm } from "../job-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewJobPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);

  const t = await getTranslations("jobs");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">{t("createTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("createSubtitle")}</p>

      <div className="mt-8">
        <JobForm action={createJob} submitLabel={t("createButton")} locale={locale} />
      </div>
    </div>
  );
}
