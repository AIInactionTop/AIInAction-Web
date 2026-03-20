"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Reflection = {
  id: string;
  reflection: string | null;
  completedAt: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

export function ReflectionsSection({ reflections }: { reflections: Reflection[] }) {
  const t = useTranslations("reflections");

  if (reflections.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl font-semibold">{t("title")}</h2>
      <div className="mt-4 space-y-4">
        {reflections.map((r) => (
          <div
            key={r.id}
            className="rounded-lg border border-border/60 bg-card/50 p-4"
          >
            <div className="flex items-center gap-2">
              {r.user.image && (
                <Image
                  src={r.user.image}
                  alt={r.user.name || ""}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              )}
              <Link
                href={`/profile/${r.user.id}`}
                className="text-sm font-medium hover:underline"
              >
                {r.user.name}
              </Link>
              {r.completedAt && (
                <span className="text-xs text-muted-foreground">
                  {t("completedOn", {
                    date: new Date(r.completedAt).toLocaleDateString(),
                  })}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {r.reflection}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
