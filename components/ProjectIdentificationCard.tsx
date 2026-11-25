"use client";

import { Project } from "@/lib/types";

interface ProjectIdentificationCardProps {
  project: Project;
  qrDataUrl?: string | null;
  showQr?: boolean;
}

function formatRel(val: unknown): string {
  if (!val) return "";
  if (Array.isArray(val) && val.length > 1) return String(val[1]);
  return String(val);
}

export function ProjectIdentificationCard({
  project,
  qrDataUrl,
  showQr = true,
}: ProjectIdentificationCardProps) {
  const projectName = project.name || "—";
  const workOrderNo = project.x_work_order_no || `MM-${project.id}`;
  const projectManager =
    project.x_project_manager || formatRel(project.user_id) || "—";
  const programmer = project.x_programmer || "—";
  const scale = project.x_scale || "—";
  const deliveryDate =
    project.x_delivery_date ||
    (project.date ? String(project.date).slice(0, 10) : "—");
  const baseSize = project.x_base_size || "—";
  const powerConsumption = project.x_power_consumption || "—";

  const topRows = [
    { label: "PROJECT NAME", value: projectName },
    { label: "WORK ORDER NO", value: workOrderNo },
    { label: "PROJECT MANAGER", value: projectManager },
    { label: "PROGRAMMER", value: programmer },
  ];

  return (
    <div className="mimar-id-sheet bg-surface border border-border rounded-2xl print:rounded-none print:border-0 overflow-hidden text-text w-full">
      <div className="p-4 sm:p-9 print:p-10">
        {/* Header: Blue Square + PROJECT IDENTIFICATION */}
        <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-7 print:mb-7">
          <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 print:w-4 print:h-4 bg-primary shrink-0" />
          <h2 className="text-sm sm:text-xl print:text-xl font-bold uppercase tracking-[0.1em] sm:tracking-[0.12em] print:tracking-[0.12em] text-text">
            PROJECT IDENTIFICATION
          </h2>
        </div>

        {/* Top 4 Full-Width Rows */}
        <div className="space-y-2.5 sm:space-y-3 print:space-y-3">
          {topRows.map((row) => (
            <div
              key={row.label}
              className="flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center gap-1 sm:gap-2 print:gap-2"
            >
              <div className="flex items-center justify-between sm:w-52 print:w-52 shrink-0">
                <span className="text-[10px] sm:text-xs print:text-xs font-semibold uppercase tracking-[0.06em] text-primary">
                  {row.label}
                </span>
                <span className="hidden sm:inline print:inline font-bold text-primary px-2">
                  :
                </span>
              </div>
              <div className="flex-1 bg-background rounded-lg sm:rounded-none print:rounded-none px-3.5 sm:px-4 py-2.5 sm:py-3 print:py-3 min-h-[38px] sm:min-h-[42px] flex items-center">
                <span className="text-xs sm:text-sm print:text-sm font-bold uppercase tracking-[0.03em] text-text break-words leading-snug">
                  {row.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Divider 1 */}
        <div className="my-4 sm:my-6 print:my-6 border-t border-border" />

        {/* Middle 2x2 Grid: Compact 2-column on mobile phones & landscape print */}
        <div className="grid grid-cols-2 gap-x-3 sm:gap-x-8 print:gap-x-8 gap-y-3">
          {/* Scale */}
          <div className="flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center gap-1 sm:gap-3 print:gap-3">
            <span className="sm:w-28 print:w-28 shrink-0 text-[10px] sm:text-xs print:text-xs font-semibold uppercase tracking-[0.06em] text-primary">
              SCALE :
            </span>
            <div className="flex-1 bg-background rounded-lg sm:rounded-none print:rounded-none px-3 sm:px-4 py-2.5 min-h-[38px] sm:min-h-[40px] flex items-center">
              <span className="text-xs sm:text-sm print:text-sm font-bold uppercase tracking-[0.03em] text-text break-words">
                {scale}
              </span>
            </div>
          </div>

          {/* Delivery Date */}
          <div className="flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center gap-1 sm:gap-3 print:gap-3">
            <span className="sm:w-44 print:w-44 shrink-0 text-[10px] sm:text-xs print:text-xs font-semibold uppercase tracking-[0.06em] text-primary">
              DELIVERY DATE :
            </span>
            <div className="flex-1 bg-background rounded-lg sm:rounded-none print:rounded-none px-3 sm:px-4 py-2.5 min-h-[38px] sm:min-h-[40px] flex items-center">
              <span className="text-xs sm:text-sm print:text-sm font-bold uppercase tracking-[0.03em] text-text break-words">
                {deliveryDate}
              </span>
            </div>
          </div>

          {/* Base Size */}
          <div className="flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center gap-1 sm:gap-3 print:gap-3">
            <span className="sm:w-28 print:w-28 shrink-0 text-[10px] sm:text-xs print:text-xs font-semibold uppercase tracking-[0.06em] text-primary">
              BASE SIZE :
            </span>
            <div className="flex-1 bg-background rounded-lg sm:rounded-none print:rounded-none px-3 sm:px-4 py-2.5 min-h-[38px] sm:min-h-[40px] flex items-center">
              <span className="text-xs sm:text-sm print:text-sm font-bold uppercase tracking-[0.03em] text-text break-words">
                {baseSize}
              </span>
            </div>
          </div>

          {/* Power Consumption */}
          <div className="flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center gap-1 sm:gap-3 print:gap-3">
            <span className="sm:w-44 print:w-44 shrink-0 text-[10px] sm:text-xs print:text-xs font-semibold uppercase tracking-[0.06em] text-primary">
              POWER CONSUMPTION :
            </span>
            <div className="flex-1 bg-background rounded-lg sm:rounded-none print:rounded-none px-3 sm:px-4 py-2.5 min-h-[38px] sm:min-h-[40px] flex items-center">
              <span className="text-xs sm:text-sm print:text-sm font-bold uppercase tracking-[0.03em] text-text break-words">
                {powerConsumption}
              </span>
            </div>
          </div>
        </div>

        {/* Divider 2 */}
        <div className="my-4 sm:my-6 print:my-6 border-t border-border" />

        {/* Footer: Mimar Models Logo Left + QR Code Right */}
        <div className="flex items-center justify-between gap-4 pt-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo.png"
            alt="Mimar Models - Reality Miniaturized"
            className="h-10 sm:h-16 print:h-16 w-auto object-contain"
          />

          {showQr && (
            <div className="shrink-0">
              {qrDataUrl ? (
                <div className="p-1.5 sm:p-2 bg-surface border border-border/60 print:border-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt={`QR code for ${projectName}`}
                    className="w-20 h-20 sm:w-24 sm:h-24 print:w-28 print:h-28 object-contain"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 border border-dashed border-border rounded-lg flex items-center justify-center text-[10px] text-secondary text-center p-2 no-print">
                  QR not generated
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Mimar Blue Bar */}
      <div className="h-2.5 sm:h-3.5 print:h-4 w-full bg-primary" />
    </div>
  );
}
