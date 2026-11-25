"use client";

import { useState, useEffect, useTransition } from "react";
import dynamic from "next/dynamic";
import QRCode from "qrcode";
import Link from "next/link";
import { Project } from "@/lib/types";
import {
  createProjectAction,
  ensureProjectTokenAction,
} from "@/app/actions/admin";
import { ProjectIdentificationCard } from "./ProjectIdentificationCard";
import {
  PlusCircle,
  QrCode,
  FolderOpen,
  Printer,
  Download,
  Search,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const QRScanner = dynamic(
  () => import("@/components/QRScanner").then((mod) => mod.QRScanner),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-[50dvh] text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <span className="text-xs text-secondary">Starting camera...</span>
      </div>
    ),
  }
);

interface AdminDashboardProps {
  initialProjects: Project[];
  appBaseUrl: string;
}

type AdminTab = "create" | "projects" | "scan";

export function AdminQRManager({
  projects: initialProjects,
  appBaseUrl,
}: {
  projects: Project[];
  appBaseUrl: string;
}) {
  return (
    <AdminDashboard
      initialProjects={initialProjects}
      appBaseUrl={appBaseUrl}
    />
  );
}

export function AdminDashboard({
  initialProjects,
  appBaseUrl,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("projects");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [qrImages, setQrImages] = useState<Record<number, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Individually expanded/selected project IDs in the Projects tab (empty by default — nothing forced open)
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  // Toggleable preview in Create Project tab
  const [showCreatePreview, setShowCreatePreview] = useState(true);

  // Create Project form state
  const [name, setName] = useState("");
  const [workOrderNo, setWorkOrderNo] = useState("");
  const [projectManager, setProjectManager] = useState("");
  const [programmer, setProgrammer] = useState("");
  const [scale, setScale] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [baseSize, setBaseSize] = useState("");
  const [powerConsumption, setPowerConsumption] = useState("");

  const [createdProject, setCreatedProject] = useState<Project | null>(null);
  // Dedicated target only for @media print output
  const [printingProject, setPrintingProject] = useState<Project | null>(
    initialProjects[0] || null
  );

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    let cancelled = false;
    async function buildQrs() {
      const origin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : appBaseUrl;
      const cleanBase = origin.replace(/\/+$/, "");
      const map: Record<number, string> = {};

      for (const proj of projects) {
        if (proj.x_qr_token) {
          try {
            const qrUrl = `${cleanBase}/m/${proj.x_qr_token}`;
            const dataUrl = await QRCode.toDataURL(qrUrl, {
              width: 360,
              margin: 1,
              color: {
                dark: "#1c2833",
                light: "#ffffff",
              },
            });
            map[proj.id] = dataUrl;
          } catch (err) {
            console.error("QR generation failed:", err);
          }
        }
      }
      if (!cancelled) {
        setQrImages(map);
      }
    }
    buildQrs();
    return () => {
      cancelled = true;
    };
  }, [projects, appBaseUrl]);

  const toggleProjectSheet = (projectId: number) => {
    setExpandedIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const draftPreviewProject: Project = createdProject || {
    id: 0,
    name: name || "COMPANY AND PROJECT NAME",
    x_work_order_no: workOrderNo || "MM-12345",
    x_project_manager: projectManager || "SAMPLE NAME",
    x_programmer: programmer || "SAMPLE NAME",
    x_scale: scale || "1-1000",
    x_delivery_date: deliveryDate || "13.11.2026",
    x_base_size: baseSize || "3M X 2 M X 5 M",
    x_power_consumption: powerConsumption || "300 WATTS",
    x_qr_token: null,
  };

  const handleCreateAndGenerate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await createProjectAction({
        name,
        workOrderNo,
        projectManager,
        programmer,
        scale,
        deliveryDate,
        baseSize,
        powerConsumption,
        generateQr: true,
      });

      if (res.error || !res.project) {
        setFeedback({
          type: "error",
          text: res.error || "Failed to create project.",
        });
        return;
      }

      const newProj = res.project;
      setProjects((prev) => [newProj, ...prev]);
      setCreatedProject(newProj);
      setPrintingProject(newProj);
      setShowCreatePreview(true);
      setFeedback({
        type: "success",
        text: "Project created and QR code generated. Ready to print or download.",
      });
    });
  };

  const handleResetCreateForm = () => {
    setCreatedProject(null);
    setName("");
    setWorkOrderNo("");
    setProjectManager("");
    setProgrammer("");
    setScale("");
    setDeliveryDate("");
    setBaseSize("");
    setPowerConsumption("");
    setFeedback(null);
  };

  const handleGenerateTokenForExisting = (project: Project) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await ensureProjectTokenAction(project.id);
      if (res.error || !res.token) {
        setFeedback({
          type: "error",
          text: res.error || "Failed to generate QR.",
        });
        return;
      }
      const updatedProj: Project = { ...project, x_qr_token: res.token };
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? updatedProj : p))
      );
      if (createdProject?.id === project.id) {
        setCreatedProject(updatedProj);
      }
      setPrintingProject(updatedProj);
      setExpandedIds((prev) =>
        prev.includes(project.id) ? prev : [...prev, project.id]
      );
      setFeedback({
        type: "success",
        text: `QR generated for ${project.name}.`,
      });
    });
  };

  const handlePrintProject = (project: Project) => {
    setPrintingProject(project);
    setTimeout(() => {
      window.print();
    }, 80);
  };

  const handleDownloadQrPng = (project: Project) => {
    const dataUrl = qrImages[project.id];
    if (!dataUrl) return;
    const link = document.createElement("a");
    const slug = (project.x_work_order_no || project.name)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .slice(0, 35);
    link.download = `mimar-qr-${slug}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredProjects = projects.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.x_work_order_no || "").toLowerCase().includes(q) ||
      (p.x_project_manager || "").toLowerCase().includes(q) ||
      (p.x_programmer || "").toLowerCase().includes(q) ||
      (p.x_qr_token || "").toLowerCase().includes(q)
    );
  });

  const activePrintCard =
    activeTab === "create"
      ? createdProject || draftPreviewProject
      : printingProject || projects[0] || draftPreviewProject;

  const inputClass =
    "w-full px-4 py-3 bg-background border border-border rounded-xl text-base sm:text-sm font-medium text-text placeholder-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface disabled:opacity-70";

  return (
    <div className="space-y-5">
      {/* Top Navigation Tabs */}
      <div className="bg-surface rounded-2xl p-1.5 sm:p-2 border border-border grid grid-cols-3 gap-1.5 sm:gap-2 lg:max-w-xl no-print">
        <button
          type="button"
          onClick={() => {
            setActiveTab("projects");
            setFeedback(null);
          }}
          className={`py-2.5 px-2 sm:py-3 sm:px-4 rounded-xl text-[11px] sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition ${
            activeTab === "projects"
              ? "bg-primary text-surface"
              : "text-secondary hover:text-text hover:bg-background"
          }`}
        >
          <FolderOpen className="w-4 h-4 shrink-0" />
          <span>Projects ({projects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("create");
            setFeedback(null);
          }}
          className={`py-2.5 px-2 sm:py-3 sm:px-4 rounded-xl text-[11px] sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition ${
            activeTab === "create"
              ? "bg-primary text-surface"
              : "text-secondary hover:text-text hover:bg-background"
          }`}
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span>Create Project</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("scan");
            setFeedback(null);
          }}
          className={`py-2.5 px-2 sm:py-3 sm:px-4 rounded-xl text-[11px] sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition ${
            activeTab === "scan"
              ? "bg-primary text-surface"
              : "text-secondary hover:text-text hover:bg-background"
          }`}
        >
          <QrCode className="w-4 h-4 shrink-0" />
          <span>Scan QR</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2.5 no-print ${
            feedback.type === "success"
              ? "bg-status-doneBg text-status-done border border-status-done/30"
              : "bg-status-issueBg text-status-issue border border-status-issue/30"
          }`}
        >
          {feedback.type === "success" ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* TAB 1: ALL PROJECTS — Individual Select (Show) & Hide per Project */}
      {activeTab === "projects" && (
        <div className="space-y-4 no-print">
          {/* Search Bar + Optional Hide All */}
          <div className="bg-surface rounded-2xl p-3.5 sm:p-4 border border-border flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by project name, work order no, manager..."
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-base sm:text-sm text-text placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface transition"
              />
            </div>

            {expandedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setExpandedIds([])}
                className="py-2.5 px-4 bg-background hover:bg-border/40 border border-border rounded-xl text-xs font-semibold text-secondary hover:text-text inline-flex items-center justify-center gap-1.5 shrink-0 transition"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide All ({expandedIds.length})</span>
              </button>
            )}
          </div>

          {/* Projects List with Individual Expand/Hide Identification Sheet */}
          {filteredProjects.length === 0 ? (
            <div className="bg-surface rounded-2xl p-10 border border-border text-center text-sm text-secondary">
              No matching projects found.
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredProjects.map((project) => {
                const hasToken = Boolean(
                  project.x_qr_token && project.x_qr_token.trim().length > 0
                );
                const qrUrl = qrImages[project.id];
                const isExpanded = expandedIds.includes(project.id);

                return (
                  <div
                    key={project.id}
                    className={`bg-surface rounded-2xl border transition overflow-hidden ${
                      isExpanded
                        ? "border-primary ring-1 ring-primary/25"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {/* Project Summary Header Row */}
                    <div
                      onClick={() => toggleProjectSheet(project.id)}
                      className="p-4 sm:p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {hasToken && qrUrl ? (
                          <div className="p-1.5 bg-surface border border-border rounded-xl shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={qrUrl}
                              alt={project.name}
                              className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-background border border-dashed border-border flex items-center justify-center text-[10px] text-secondary text-center shrink-0 p-1">
                            No QR
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                              {project.x_work_order_no || `MM-${project.id}`}
                            </span>
                          </div>
                          <h3 className="font-bold text-text text-sm sm:text-base truncate mt-0.5">
                            {project.name}
                          </h3>
                          <div className="text-xs text-secondary mt-0.5 truncate">
                            Manager:{" "}
                            {project.x_project_manager || "—"} · Scale:{" "}
                            {project.x_scale || "—"} · Delivery:{" "}
                            {project.x_delivery_date || project.date || "—"}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div
                        className="flex flex-wrap items-center gap-2 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!hasToken ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              handleGenerateTokenForExisting(project)
                            }
                            className="py-2 px-3.5 bg-primary hover:bg-primary-dark text-surface rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Generate QR</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleProjectSheet(project.id)}
                              className={`py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                                isExpanded
                                  ? "bg-primary/10 border-primary/30 text-primary"
                                  : "bg-background hover:bg-border/40 border-border text-text"
                              }`}
                            >
                              {isExpanded ? (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" />
                                  <span>Hide Sheet</span>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3.5 h-3.5 text-primary" />
                                  <span>Show Sheet</span>
                                  <ChevronDown className="w-3.5 h-3.5 text-secondary" />
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePrintProject(project)}
                              className="py-2 px-3.5 bg-primary hover:bg-primary-dark text-surface rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadQrPng(project)}
                              className="py-2 px-3 bg-background hover:bg-border/40 border border-border text-text rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                              title="Download QR PNG"
                            >
                              <Download className="w-3.5 h-3.5 text-secondary" />
                              <span>QR PNG</span>
                            </button>

                            <Link
                              href={`/project/${project.x_qr_token}`}
                              className="py-2 px-3 bg-background hover:bg-border/40 border border-border text-primary rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                            >
                              <span>Details</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Individual Collapsible Project Identification Sheet */}
                    {isExpanded && (
                      <div className="px-4 pb-5 sm:px-6 sm:pb-6 pt-4 bg-background/60 border-t border-border space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                            Project Identification Sheet
                          </span>
                          <div className="flex items-center gap-2">
                            {hasToken && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadQrPng(project)}
                                  className="py-1.5 px-3 min-h-[36px] bg-surface border border-border text-text rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-background transition"
                                >
                                  <Download className="w-3.5 h-3.5 text-primary" />
                                  <span>QR PNG</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePrintProject(project)}
                                  className="py-1.5 px-3.5 min-h-[36px] bg-primary hover:bg-primary-dark text-surface rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>Print Sheet</span>
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleProjectSheet(project.id)}
                              className="py-1.5 px-3 min-h-[36px] bg-surface border border-border text-secondary hover:text-text rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Hide</span>
                            </button>
                          </div>
                        </div>

                        <div className="max-w-4xl mx-auto">
                          <ProjectIdentificationCard
                            project={project}
                            qrDataUrl={qrUrl || null}
                            showQr={true}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CREATE PROJECT */}
      {activeTab === "create" && (
        <div
          className={`space-y-6 ${
            showCreatePreview
              ? "lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start"
              : "max-w-2xl"
          } no-print`}
        >
          <div
            className={`${
              showCreatePreview ? "lg:col-span-5" : ""
            } bg-surface rounded-2xl p-5 sm:p-6 border border-border`}
          >
            <div className="flex items-center justify-between gap-2 mb-5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-text">
                  Create Project & Generate QR
                </h2>
                <p className="text-xs text-secondary mt-0.5">
                  Enter model details to generate its QR code and printable sheet.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreatePreview((v) => !v)}
                  className="py-2 px-3 bg-background hover:bg-border/40 border border-border rounded-xl text-xs font-semibold text-secondary hover:text-text inline-flex items-center gap-1.5 transition"
                >
                  {showCreatePreview ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide Preview</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      <span>Show Preview</span>
                    </>
                  )}
                </button>
                {createdProject && (
                  <button
                    type="button"
                    onClick={handleResetCreateForm}
                    className="py-2 px-3 bg-background hover:bg-border/40 border border-border rounded-xl text-xs font-semibold text-text transition"
                  >
                    New
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleCreateAndGenerate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                  <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(createdProject)}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="COMPANY AND PROJECT NAME"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">
                    Work Order No *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(createdProject)}
                    value={workOrderNo}
                    onChange={(e) => setWorkOrderNo(e.target.value)}
                    placeholder="MM-12345"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">
                    Project Manager *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(createdProject)}
                    value={projectManager}
                    onChange={(e) => setProjectManager(e.target.value)}
                    placeholder="SAMPLE NAME"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">
                    Programmer *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(createdProject)}
                    value={programmer}
                    onChange={(e) => setProgrammer(e.target.value)}
                    placeholder="SAMPLE NAME"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">
                    Scale *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(createdProject)}
                    value={scale}
                    onChange={(e) => setScale(e.target.value)}
                    placeholder="1-1000"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">
                    Delivery Date *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(createdProject)}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    placeholder="13.11.2026"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">
                    Base Size *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(createdProject)}
                    value={baseSize}
                    onChange={(e) => setBaseSize(e.target.value)}
                    placeholder="3M X 2 M X 5 M"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                  <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">
                    Power Consumption *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(createdProject)}
                    value={powerConsumption}
                    onChange={(e) => setPowerConsumption(e.target.value)}
                    placeholder="300 WATTS"
                    className={inputClass}
                  />
                </div>
              </div>

              {!createdProject ? (
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-3.5 px-5 bg-primary hover:bg-primary-dark text-surface font-semibold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-60 text-sm sm:text-base"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Creating & Generating QR...</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="w-5 h-5" />
                        <span>Generate QR & Save Project</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handlePrintProject(createdProject)}
                    className="w-full py-3.5 px-5 bg-primary hover:bg-primary-dark text-surface font-semibold rounded-xl flex items-center justify-center gap-2 transition text-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Identification Sheet</span>
                  </button>

                  {qrImages[createdProject.id] && (
                    <button
                      type="button"
                      onClick={() => handleDownloadQrPng(createdProject)}
                      className="flex-1 py-3 px-4 bg-background hover:bg-surface border border-border text-text font-semibold rounded-xl flex items-center justify-center gap-2 transition text-xs sm:text-sm"
                    >
                      <Download className="w-4 h-4 text-primary" />
                      <span>Download PNG</span>
                    </button>
                  )}

                  {createdProject.x_qr_token && (
                    <Link
                      href={`/project/${createdProject.x_qr_token}`}
                      className="flex-1 py-3 px-4 bg-background hover:bg-surface border border-border text-primary font-semibold rounded-xl flex items-center justify-center gap-1.5 transition text-xs sm:text-sm"
                    >
                      <span>Project Page</span>
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              )}
            </form>
          </div>

          {showCreatePreview && (
            <div className="lg:col-span-7 lg:sticky lg:top-24 space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                  {createdProject
                    ? "Generated Project Identification Sheet"
                    : "Live Print Sheet Preview"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreatePreview(false)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:text-text"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Hide</span>
                </button>
              </div>

              <ProjectIdentificationCard
                project={draftPreviewProject}
                qrDataUrl={
                  createdProject ? qrImages[createdProject.id] || null : null
                }
                showQr={true}
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 3: IN-APP QR SCANNER */}
      {activeTab === "scan" && (
        <div className="bg-surface rounded-2xl p-5 sm:p-8 border border-border no-print">
          <div className="max-w-lg mx-auto">
            <QRScanner appBaseUrl={appBaseUrl} />
          </div>
        </div>
      )}

      {/* DEDICATED PRINT-ONLY SHEET */}
      <div className="hidden print:block print-only">
        <ProjectIdentificationCard
          project={activePrintCard}
          qrDataUrl={
            activePrintCard.id ? qrImages[activePrintCard.id] || null : null
          }
          showQr={true}
        />
      </div>
    </div>
  );
}
