import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "project_qr_session";
const SCAN_COOKIE = "project_qr_scanned";

function getSecretKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ||
    "project-qr-app-production-secret-key-min-32-chars-long";
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static files, PWA service worker, offline fallback, brand assets, icons, and public model camera page (/m/[token])
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/brand/") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.png" ||
    pathname === "/apple-icon.png" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/offline.html" ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/m/")
  ) {
    return NextResponse.next();
  }

  // Verify user session cookie if present
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  let session: Record<string, unknown> | null = null;

  if (sessionToken) {
    try {
      const { payload } = await jwtVerify(sessionToken, getSecretKey());
      session = payload as Record<string, unknown>;
    } catch {
      session = null;
    }
  }

  // /login: if already logged in, send admin to /admin and non-admin to /scan
  if (pathname === "/login") {
    if (session) {
      const dest = session.isAdmin ? "/admin" : "/scan";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  // Root "/": send logged-in admin to /admin; non-admin renders / directly (200 OK for Android WebAPK start_url!)
  if (pathname === "/") {
    if (session?.isAdmin) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // /scan: accessible to anyone with the link (shows only scanning camera for non-admins)
  if (pathname === "/scan") {
    return NextResponse.next();
  }

  // /project/[token]: allowed if logged in OR if scanned through the in-app camera scanner
  if (pathname.startsWith("/project/")) {
    if (session) {
      return NextResponse.next();
    }

    const tokenFromPath = pathname.replace("/project/", "").split("/")[0]?.trim();
    const scanCookie = request.cookies.get(SCAN_COOKIE)?.value;

    if (scanCookie && tokenFromPath) {
      try {
        const { payload } = await jwtVerify(scanCookie, getSecretKey());
        const tokens = Array.isArray((payload as { tokens?: unknown }).tokens)
          ? ((payload as { tokens: string[] }).tokens as string[])
          : [];
        if (tokens.includes(tokenFromPath)) {
          return NextResponse.next();
        }
      } catch {
        // Invalid scan cookie
      }
    }

    if (tokenFromPath) {
      return NextResponse.redirect(new URL(`/m/${tokenFromPath}`, request.url));
    }
    return NextResponse.redirect(new URL("/scan", request.url));
  }

  // /admin: strictly requires admin login
  if (pathname.startsWith("/admin")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!session.isAdmin) {
      return NextResponse.redirect(new URL("/scan", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|brand/|favicon.ico|icon.png|apple-icon.png|manifest.json|sw.js|offline.html|icons/).*)",
  ],
};
