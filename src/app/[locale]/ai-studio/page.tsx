import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = {
  params: Promise<{ locale: string }>;
};

const agents = [
  {
    id: "challenge-agent",
    icon: "🎯",
    nameKey: "challengeAgent.name" as const,
    descriptionKey: "challengeAgent.description" as const,
    available: true,
  },
  {
    id: "prototype-agent",
    icon: "🛠️",
    nameKey: "prototypeAgent.name" as const,
    descriptionKey: "prototypeAgent.description" as const,
    available: false,
  },
  {
    id: "writer-agent",
    icon: "✍️",
    nameKey: "writerAgent.name" as const,
    descriptionKey: "writerAgent.description" as const,
    available: false,
  },
] as const;

export default async function AIStudioPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);

  const t = await getTranslations("aiStudio.hub");

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const card = (
            <Card
              className={
                agent.available
                  ? "transition-shadow hover:shadow-md cursor-pointer"
                  : "opacity-50 cursor-default"
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="text-4xl">{agent.icon}</span>
                  <Badge
                    variant={agent.available ? "default" : "secondary"}
                  >
                    {agent.available ? t("available") : t("comingSoon")}
                  </Badge>
                </div>
                <CardTitle className="mt-3 text-lg">
                  {t(agent.nameKey)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {t(agent.descriptionKey)}
                </CardDescription>
              </CardContent>
            </Card>
          );

          if (agent.available) {
            return (
              <Link
                key={agent.id}
                href={`/${locale}/ai-studio/${agent.id}`}
                className="no-underline"
              >
                {card}
              </Link>
            );
          }

          return <div key={agent.id}>{card}</div>;
        })}
      </div>
    </div>
  );
}
