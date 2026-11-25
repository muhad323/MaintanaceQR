"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { PageTitle } from "./PageTitle";
import { InstallAppButton } from "./PwaManager";
import { LogOut, Shield, QrCode } from "lucide-react";

interface HeaderBarProps {
  isLoggedIn: boolean;
  isAdmin: boolean;
}

export function HeaderBar({ isLoggedIn, isAdmin }: HeaderBarProps) {
  const pathname = usePathname();

  if (pathname === "/login" || pathname.startsWith("/m/")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top)] no-print">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
        <Link
          href={isAdmin ? "/admin" : "/scan"}
          className="flex items-center shrink-0"
        >
          <Image
            src="/brand/logo.png"
            alt="Mimar Models Logo"
            width={140}
            height={56}
            priority
            className="h-8 sm:h-9 lg:h-10 w-auto object-contain"
          />
        </Link>

        {/* Mobile Title vs Tablet/Desktop Admin Nav */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          {isAdmin ? (
            <>
              <div className="md:hidden">
                <PageTitle />
              </div>
              <nav className="hidden md:flex items-center gap-1.5 bg-background p-1 rounded-xl border border-border">
                <Link
                  href="/admin"
                  className={`px-4 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition ${
                    pathname.startsWith("/admin")
                      ? "bg-primary text-surface"
                      : "text-secondary hover:text-text"
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Dashboard</span>
                </Link>
                <Link
                  href="/scan"
                  className={`px-4 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition ${
                    pathname === "/" || pathname === "/scan" || pathname.startsWith("/project/")
                      ? "bg-primary text-surface"
                      : "text-secondary hover:text-text"
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan QR</span>
                </Link>
              </nav>
            </>
          ) : (
            <PageTitle />
          )}
        </div>

        <div className="shrink-0 flex items-center justify-end gap-2 min-w-[44px]">
          <InstallAppButton />

          {isLoggedIn ? (
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Logout"
                title="Logout"
                className="p-2.5 text-secondary hover:text-status-issue active:bg-background rounded-xl transition flex items-center justify-center gap-1.5 text-xs font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline">Logout</span>
              </button>
            </form>
          ) : pathname === "/" || pathname === "/scan" ? (
            <Link
              href="/login"
              title="Admin Sign in"
              className="px-2.5 py-2 text-xs font-medium text-secondary hover:text-primary active:bg-background rounded-xl transition inline-flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
