import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("termsTitle"),
    description: t("termsDescription"),
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("terms");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("lastUpdated")}
        </p>
      </header>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <Section title={t("introTitle")}>
          <p>{t("introContent")}</p>
        </Section>

        <Section title={t("accountTitle")}>
          <p>{t("accountContent")}</p>
        </Section>

        <Section title={t("useTitle")}>
          <p>{t("useContent")}</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>{t("useContent1")}</li>
            <li>{t("useContent2")}</li>
            <li>{t("useContent3")}</li>
            <li>{t("useContent4")}</li>
            <li>{t("useContent5")}</li>
          </ul>
        </Section>

        <Section title={t("contentTitle")}>
          <p>{t("contentContent")}</p>
        </Section>

        <Section title={t("ipTitle")}>
          <p>{t("ipContent")}</p>
        </Section>

        <Section title={t("apiTitle")}>
          <p>{t("apiContent")}</p>
        </Section>

        <Section title={t("terminationTitle")}>
          <p>{t("terminationContent")}</p>
        </Section>

        <Section title={t("disclaimerTitle")}>
          <p>{t("disclaimerContent")}</p>
        </Section>

        <Section title={t("liabilityTitle")}>
          <p>{t("liabilityContent")}</p>
        </Section>

        <Section title={t("changesTitle")}>
          <p>{t("changesContent")}</p>
        </Section>

        <Section title={t("governingTitle")}>
          <p>{t("governingContent")}</p>
        </Section>

        <Section title={t("contactTitle")}>
          <p>{t("contactContent")}</p>
          <p>
            <a
              href="mailto:support@aiinaction.top"
              className="text-primary hover:underline"
            >
              support@aiinaction.top
            </a>
          </p>
        </Section>
      </div>

      <div className="mt-12 border-t border-border pt-6">
        <Link
          href="/privacy"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          {locale === "zh" ? "查看隐私政策 →" : "View Privacy Policy →"}
        </Link>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed">
        {children}
      </div>
    </section>
  );
}
