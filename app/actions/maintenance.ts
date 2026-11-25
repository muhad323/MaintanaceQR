"use server";

import { revalidatePath } from "next/cache";
import { addMaintenanceLogSchema } from "@/lib/validation";
import { getOdooService } from "@/lib/odoo";
import { getSession } from "@/lib/session";
import { hasScannedSpecificToken } from "@/lib/scanAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { PhotoUploadPayload } from "@/lib/types";

export interface MaintenanceActionState {
  error?: string;
  success?: boolean;
  message?: string;
}

export async function addMaintenanceLogAction(
  prevState: MaintenanceActionState | null,
  formData: FormData
): Promise<MaintenanceActionState> {
  const rawToken = String(formData.get("token") || "").trim();
  const session = await getSession();
  const hasScanned = rawToken ? await hasScannedSpecificToken(rawToken) : false;

  if (!session && !hasScanned) {
    return {
      error: "Please scan the project QR code inside the app before submitting an update.",
    };
  }

  const rateKey = session ? `add_log:uid:${session.uid}` : `add_log:tok:${rawToken}`;
  const rateLimit = checkRateLimit(rateKey, 15, 60 * 1000);
  if (!rateLimit.allowed) {
    return {
      error: `Rate limit reached. Please wait ${rateLimit.retryAfterSeconds} seconds before submitting again.`,
    };
  }

  let parsedPhotos: PhotoUploadPayload[] = [];
  const rawPhotosJson = formData.get("photosJson");
  if (rawPhotosJson && typeof rawPhotosJson === "string") {
    try {
      parsedPhotos = JSON.parse(rawPhotosJson);
    } catch {
      return { error: "Invalid image upload payload." };
    }
  }

  const rawData = {
    projectId: formData.get("projectId"),
    token: rawToken,
    doneBy: formData.get("doneBy") || session?.name || "",
    note: formData.get("note"),
    status: formData.get("status"),
    photos: parsedPhotos,
  };

  const parseResult = addMaintenanceLogSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg =
      parseResult.error.errors[0]?.message || "Invalid maintenance update data";
    return { error: errorMsg };
  }

  const { projectId, token, doneBy, note, status, photos } = parseResult.data;

  try {
    const service = getOdooService();

    // Verify token belongs to the target project so scanned access is scoped strictly to this project
    const targetProject = await service.getProjectByToken(token);
    if (!targetProject || targetProject.id !== projectId) {
      return { error: "Project verification failed." };
    }

    await service.addMaintenanceLog(projectId, note, status, doneBy, photos);

    revalidatePath(`/project/${token}`);
    return {
      success: true,
      message: "Maintenance update saved successfully.",
    };
  } catch (err: unknown) {
    console.error("[Add Maintenance Log Server Error]:", err);
    const msg =
      err instanceof Error ? err.message : "Failed to record maintenance update";
    return { error: msg };
  }
}
