import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SCAN_COOKIE_NAME = "project_qr_scanned";

function getSecretKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ||
    "project-qr-app-production-secret-key-min-32-chars-long";
  return new TextEncoder().encode(secret);
}

interface ScannedPayload {
  tokens: string[];
}

export async function verifyScannedCookieToken(
  cookieVal: string | undefined
): Promise<string[]> {
  if (!cookieVal) return [];
  try {
    const { payload } = await jwtVerify(cookieVal, getSecretKey());
    const data = payload as unknown as ScannedPayload;
    return Array.isArray(data.tokens) ? data.tokens : [];
  } catch {
    return [];
  }
}

export async function addScannedTokenToCookie(token: string): Promise<void> {
  const clean = token.trim();
  if (!clean) return;

  const cookieStore = cookies();
  const existing = await verifyScannedCookieToken(
    cookieStore.get(SCAN_COOKIE_NAME)?.value
  );

  const updated = Array.from(new Set([clean, ...existing])).slice(0, 25);

  const jwt = await new SignJWT({ tokens: updated })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecretKey());

  cookieStore.set(SCAN_COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function hasScannedSpecificToken(token: string): Promise<boolean> {
  const clean = token.trim();
  if (!clean) return false;
  const cookieStore = cookies();
  const tokens = await verifyScannedCookieToken(
    cookieStore.get(SCAN_COOKIE_NAME)?.value
  );
  return tokens.includes(clean);
}

export async function hasScannedAnyToken(): Promise<boolean> {
  const cookieStore = cookies();
  const tokens = await verifyScannedCookieToken(
    cookieStore.get(SCAN_COOKIE_NAME)?.value
  );
  return tokens.length > 0;
}
