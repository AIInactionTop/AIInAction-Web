import { notFound } from "next/navigation";
import { getEmailTemplate } from "@/lib/admin-emails";
import { SendEmailClient } from "./send-client";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SendEmailPage({ params }: Props) {
  const { id } = await params;
  const template = await getEmailTemplate(id);

  if (!template) notFound();

  return (
    <SendEmailClient
      template={JSON.parse(JSON.stringify(template))}
    />
  );
}
