import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { RealOdooService } from "@/lib/odoo/real";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();

  // Admin only
  if (!session || !session.isAdmin) {
    return NextResponse.json(
      {
        error: "Forbidden",
        message: "Health check is restricted to QR App Admins.",
      },
      { status: 403 }
    );
  }

  const useMock = process.env.USE_MOCK_ODOO === "true";

  if (useMock) {
    return NextResponse.json({
      status: "ok",
      mode: "mock",
      message:
        "App is running in Mock Mode (USE_MOCK_ODOO=true). Set USE_MOCK_ODOO=false to connect to live Odoo instance.",
      odooUrl: process.env.ODOO_URL || "not configured",
      odooDb: process.env.ODOO_DB || "not configured",
      mockProjectsCount: 5,
      customModel: "x_maintenance_log (Simulated)",
      customField: "project.project.x_qr_token (Simulated)",
      attachmentsModel: "ir.attachment (Simulated)",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const realService = new RealOdooService();
    const health = await realService.checkHealth();

    const isHealthy =
      health.customModelExists &&
      health.customFieldExists &&
      health.groupsConfigured.userGroupExists;

    return NextResponse.json({
      status: isHealthy ? "ok" : "warning",
      mode: "real",
      odooUrl: process.env.ODOO_URL,
      odooDb: process.env.ODOO_DB,
      odooVersion: health.version,
      customModel: {
        name: "x_maintenance_log",
        exists: health.customModelExists,
      },
      customField: {
        model: "project.project",
        field: "x_qr_token",
        exists: health.customFieldExists,
      },
      groups: {
        "QR App Users": health.groupsConfigured.userGroupExists,
        "QR App Admins": health.groupsConfigured.adminGroupExists,
      },
      details: isHealthy
        ? "Odoo connection verified: custom fields, models, and groups are accessible."
        : "Odoo connected, but some required fields or groups are missing.",
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Odoo Health Check Failed]:", err);

    return NextResponse.json(
      {
        status: "error",
        mode: "real",
        odooUrl: process.env.ODOO_URL,
        odooDb: process.env.ODOO_DB,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      },
      { status: 502 }
    );
  }
}
