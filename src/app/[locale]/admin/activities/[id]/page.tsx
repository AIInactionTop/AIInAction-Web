import { notFound } from "next/navigation";
import { getAdminActivity } from "@/lib/admin-activities";
import { AdminActivityForm } from "@/components/admin/admin-activity-form";

export default async function EditActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activity = await getAdminActivity(id);
  if (!activity) notFound();

  return (
    <AdminActivityForm activity={JSON.parse(JSON.stringify(activity))} />
  );
}
