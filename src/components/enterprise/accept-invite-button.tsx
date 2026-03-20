"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { acceptInvite } from "@/actions/enterprise-org";

export function AcceptInviteButton({ token }: { token: string }) {
  const t = useTranslations("enterprise");
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="lg"
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          acceptInvite(token);
        });
      }}
    >
      {isPending ? "..." : t("joinOrgButton")}
    </Button>
  );
}
