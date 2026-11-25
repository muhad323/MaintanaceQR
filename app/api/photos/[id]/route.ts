import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { hasScannedAnyToken } from "@/lib/scanAuth";
import { getOdooService } from "@/lib/odoo";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const hasScanned = await hasScannedAnyToken();
  if (!session && !hasScanned) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const attachmentId = parseInt(params.id, 10);
  if (isNaN(attachmentId) || attachmentId <= 0) {
    return new NextResponse("Invalid photo ID", { status: 400 });
  }

  try {
    const service = getOdooService();
    const result = await service.getAttachmentData(attachmentId);

    if (!result) {
      return new NextResponse("Photo not found", { status: 404 });
    }

    return new NextResponse(result.data as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": result.mimetype || "image/jpeg",
        "Content-Disposition": `inline; filename="${result.filename}"`,
        "Cache-Control": "private, max-age=86400, immutable",
      },
    });
  } catch (err: unknown) {
    console.error("[Photo Route Error]:", err);
    return new NextResponse("Error retrieving photo", { status: 500 });
  }
}
