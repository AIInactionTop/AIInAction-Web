import { getAdminActivities, getActivityStats } from "@/lib/admin-activities";
import { ActivityList } from "@/components/admin/activity-list";

export default async function AdminActivitiesPage() {
  const [activities, stats] = await Promise.all([
    getAdminActivities(),
    getActivityStats(),
  ]);
  return (
    <ActivityList
      activities={JSON.parse(JSON.stringify(activities))}
      stats={stats}
    />
  );
}
