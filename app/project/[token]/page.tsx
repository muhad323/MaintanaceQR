import { getOdooService } from "@/lib/odoo";
import { getSession } from "@/lib/session";
import { AddMaintenanceForm } from "@/components/AddMaintenanceForm";
import { PhotoViewer } from "@/components/PhotoViewerModal";
import { ProjectIdentificationCard } from "@/components/ProjectIdentificationCard";
import Link from "next/link";
import { ArrowLeft, QrCode, User } from "lucide-react";

interface ProjectPageProps {
  params: {
    token: string;
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const token = params.token?.trim();
  const service = getOdooService();
  const session = await getSession();

  const project = token ? await service.getProjectByToken(token) : null;

  if (!project) {
    return <ProjectNotFound />;
  }

  const logs = await service.getMaintenanceLogs(project.id);

  const renderHistoryCard = () => (
    <div className="bg-surface rounded-2xl p-4 sm:p-6 border border-border no-print">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-text text-base sm:text-lg">
          Maintenance History
        </h2>
        <span className="text-xs text-secondary font-semibold bg-background px-2.5 py-1 rounded-full border border-border">
          {logs.length} {logs.length === 1 ? "update" : "updates"}
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-10 text-secondary text-xs sm:text-sm">
          No maintenance updates recorded for this model yet.
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 ${
            logs.length > 1 ? "xl:grid-cols-2" : ""
          } gap-3.5`}
        >
          {logs.map((log) => {
            const statusBadgeClass =
              log.x_status === "done"
                ? "bg-status-doneBg text-status-done border-status-done/30"
                : log.x_status === "issue"
                ? "bg-status-issueBg text-status-issue border-status-issue/30"
                : "bg-status-pendingBg text-status-pending border-status-pending/30";

            const statusLabel =
              log.x_status === "done"
                ? "Done"
                : log.x_status === "issue"
                ? "Issue"
                : "Pending";

            const formattedDate = log.x_date
              ? new Date(log.x_date.replace(" ", "T")).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Recent";

            return (
              <div
                key={log.id}
                className="p-3.5 sm:p-4 bg-background rounded-xl border border-border space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadgeClass}`}
                    >
                      {statusLabel}
                    </span>
                    <span className="text-[11px] text-secondary">
                      {formattedDate}
                    </span>
                  </div>

                  <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                    {log.x_note}
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-secondary font-medium">
                    <User className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{log.x_done_by}</span>
                  </div>

                  {log.photos && log.photos.length > 0 && (
                    <PhotoViewer photos={log.photos} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Action Row */}
      <div className="flex items-center justify-between gap-2 no-print">
        {session?.isAdmin ? (
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:text-primary-dark active:opacity-75 py-1 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Admin Dashboard</span>
          </Link>
        ) : (
          <Link
            href="/scan"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:text-primary-dark active:opacity-75 py-1 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Scan QR</span>
          </Link>
        )}

        <Link
          href="/scan"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-text hover:bg-background active:bg-background transition"
        >
          <QrCode className="w-3.5 h-3.5 text-primary" />
          <span>Scan Another</span>
        </Link>
      </div>

      {/* Responsive Layout: Stacked on Phone/Tablet (<1024px), 2-Column Split on Laptop/Big Monitors (>=1024px) */}
      <div className="space-y-4 sm:space-y-5 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
        {/* Left Column: Project Identification + Scope + Desktop History */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4 sm:space-y-6">
          <ProjectIdentificationCard project={project} showQr={false} />

          {project.description && (
            <div className="bg-surface rounded-2xl p-4 sm:p-6 border border-border no-print">
              <span className="text-primary text-xs font-semibold uppercase tracking-wider block mb-1.5">
                Model Scope & Notes
              </span>
              <p className="text-sm text-text/85 leading-relaxed">
                {String(project.description).replace(/<[^>]*>/g, "")}
              </p>
            </div>
          )}

          {/* Desktop/Laptop History sits cleanly under Project Card */}
          <div className="hidden lg:block">{renderHistoryCard()}</div>
        </div>

        {/* Right Column: Sticky Maintenance Update Form + Mobile/Tablet History below */}
        <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-4 sm:space-y-5 no-print">
          <AddMaintenanceForm
            projectId={project.id}
            token={token}
            userName={session?.name || ""}
          />

          {/* Mobile/Tablet History sits right below the form */}
          <div className="lg:hidden">{renderHistoryCard()}</div>
        </div>
      </div>
    </div>
  );
}

function ProjectNotFound() {
  return (
    <div className="max-w-md mx-auto bg-surface rounded-2xl p-7 border border-border text-center py-16 my-8">
      <h2 className="text-lg font-bold text-text mb-2">Project not found</h2>
      <p className="text-xs text-secondary max-w-xs mx-auto mb-6">
        No project matches this QR token. Please scan a valid project code.
      </p>
      <Link
        href="/scan"
        className="inline-flex items-center justify-center px-5 py-3 bg-primary text-surface font-semibold rounded-xl text-sm hover:bg-primary-dark transition"
      >
        Return to scanner
      </Link>
    </div>
  );
}
