"use server";

import { addScannedTokenToCookie } from "@/lib/scanAuth";

export async function authorizeScannedTokenAction(
  token: string
): Promise<{ ok: boolean }> {
  if (!token || typeof token !== "string") {
    return { ok: false };
  }
  await addScannedTokenToCookie(token.trim());
  return { ok: true };
}
