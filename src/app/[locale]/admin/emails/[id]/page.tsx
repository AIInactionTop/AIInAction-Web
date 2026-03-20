import { notFound } from "next/navigation";
import { getEmailTemplate } from "@/lib/admin-emails";
import { EmailTemplateEditor } from "@/components/admin/email-template-editor";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditEmailTemplatePage({ params }: Props) {
  const { id } = await params;
  const template = await getEmailTemplate(id);

  if (!template) notFound();

  return (
    <EmailTemplateEditor
      template={JSON.parse(JSON.stringify(template))}
    />
  );
}
