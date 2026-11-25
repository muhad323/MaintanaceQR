import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { AuthUser, SessionPayload } from "./types";

const COOKIE_NAME = "project_qr_session";

function getSecretKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ||
    "project-qr-app-production-secret-key-min-32-chars-long";
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(user: AuthUser): Promise<string> {
  const payload: SessionPayload = {
    uid: user.uid,
    name: user.name,
    isAdmin: user.isAdmin,
  };

  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(user: AuthUser): Promise<void> {
  const token = await signSessionToken(user);
  const cookieStore = cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

export async function destroySession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
