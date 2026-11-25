import { getOdooService } from "@/lib/odoo";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/AdminQRManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?from=/admin");
  }
  if (!session.isAdmin) {
    redirect("/scan");
  }

  const service = getOdooService();
  const projects = await service.listProjects();
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-2xl p-5 border border-border no-print flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-text">
            Admin Dashboard
          </h1>
          <p className="text-xs text-secondary mt-0.5">
            Create model projects, generate QR codes, print identification sheets, or scan models
          </p>
        </div>
      </div>

      <AdminDashboard initialProjects={projects} appBaseUrl={appBaseUrl} />
    </div>
  );
}
