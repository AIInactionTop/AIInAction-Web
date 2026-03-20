import { notFound } from "next/navigation";
import { getEmailTemplate } from "@/lib/admin-emails";
import { EmailPreview } from "@/components/admin/email-preview";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PreviewEmailTemplatePage({ params }: Props) {
  const { id } = await params;
  const template = await getEmailTemplate(id);

  if (!template) notFound();

  return (
    <EmailPreview
      template={JSON.parse(JSON.stringify(template))}
    />
  );
}
