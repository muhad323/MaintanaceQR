"use server";

import { redirect } from "next/navigation";
import { loginSchema } from "@/lib/validation";
import { getOdooService } from "@/lib/odoo";
import { createSession, destroySession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rateLimit";

export interface AuthState {
  error?: string;
  success?: boolean;
}

export async function loginAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const rawLogin = formData.get("login");
  const rawPassword = formData.get("password");
  const rawRedirect = (formData.get("redirectTo") as string) || "";

  const parseResult = loginSchema.safeParse({
    login: rawLogin,
    password: rawPassword,
  });

  if (!parseResult.success) {
    const errorMsg = parseResult.error.errors[0]?.message || "Invalid input";
    return { error: errorMsg };
  }

  const { login, password } = parseResult.data;

  const rateLimit = checkRateLimit(
    `login:${login.toLowerCase()}`,
    6,
    10 * 60 * 1000
  );
  if (!rateLimit.allowed) {
    return {
      error: `Too many login attempts. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
    };
  }

  let isAdminUser = false;

  try {
    const service = getOdooService();
    const user = await service.authenticateUser(login, password);

    if (!user) {
      return {
        error: "Wrong login or password",
      };
    }

    isAdminUser = user.isAdmin;
    await createSession(user);
  } catch (err: unknown) {
    console.error("[Login Action Error]:", err);
    const msg =
      err instanceof Error
        ? err.message
        : "Unable to connect to Odoo. Please try again later.";
    return {
      error: msg,
    };
  }

  if (isAdminUser) {
    const target =
      rawRedirect && rawRedirect.startsWith("/") && rawRedirect !== "/scan"
        ? rawRedirect
        : "/admin";
    redirect(target);
  }

  const staffTarget =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("/admin")
      ? rawRedirect
      : "/scan";
  redirect(staffTarget);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
