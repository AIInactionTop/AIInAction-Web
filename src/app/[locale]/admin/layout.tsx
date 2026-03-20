import { requireAdminPage } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();

  return (
    <div className="flex min-h-[calc(100svh-4rem)]">
      <AdminSidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
