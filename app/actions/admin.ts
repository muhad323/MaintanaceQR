"use server";

import { revalidatePath } from "next/cache";
import { getOdooService } from "@/lib/odoo";
import { getSession } from "@/lib/session";
import { createProjectSchema } from "@/lib/validation";
import { CreateProjectInput, Project } from "@/lib/types";

export interface AdminActionResult {
  success?: boolean;
  error?: string;
  token?: string;
  project?: Project;
}

export async function createProjectAction(
  rawInput: CreateProjectInput
): Promise<AdminActionResult> {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    return { error: "Unauthorized: Admin privileges required." };
  }

  const parsed = createProjectSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message || "Invalid project fields.",
    };
  }

  try {
    const service = getOdooService();
    const project = await service.createProject(parsed.data);
    revalidatePath("/admin");
    return {
      success: true,
      project,
      token: project.x_qr_token || undefined,
    };
  } catch (err: unknown) {
    console.error("[Create Project Action Error]:", err);
    return {
      error: err instanceof Error ? err.message : "Failed to create project",
    };
  }
}

export async function ensureProjectTokenAction(
  projectId: number
): Promise<AdminActionResult> {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    return { error: "Unauthorized: Admin privileges required." };
  }

  try {
    const service = getOdooService();
    const token = await service.ensureToken(projectId);
    revalidatePath("/admin");
    return { success: true, token };
  } catch (err: unknown) {
    console.error("[Ensure Token Action Error]:", err);
    return {
      error: err instanceof Error ? err.message : "Failed to ensure token",
    };
  }
}

export async function generateAllTokensAction(): Promise<AdminActionResult> {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    return { error: "Unauthorized: Admin privileges required." };
  }

  try {
    const service = getOdooService();
    const projects = await service.listProjects();

    for (const p of projects) {
      if (!p.x_qr_token || p.x_qr_token.trim().length === 0) {
        await service.ensureToken(p.id);
      }
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (err: unknown) {
    console.error("[Generate All Tokens Error]:", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to generate tokens for all projects",
    };
  }
}
