import { getEmailTemplates } from "@/lib/admin-emails";
import { EmailTemplateList } from "@/components/admin/email-template-list";

export default async function EmailTemplatesPage() {
  const templates = await getEmailTemplates();

  return (
    <EmailTemplateList
      templates={JSON.parse(JSON.stringify(templates))}
    />
  );
}
